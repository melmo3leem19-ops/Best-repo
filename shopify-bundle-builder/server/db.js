/**
 * SQLite persistence layer (better-sqlite3, synchronous, WAL mode).
 *
 * Single-file design keeps deploys simple; the API surface below is the only
 * thing routes touch, so swapping to Postgres later means reimplementing this
 * module only. Bundle definitions are stored as JSON documents — they're
 * read-heavy, write-light, and schema-flexible (each bundle type carries a
 * different rule shape).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { config } = require('./config');

let db;

function init(databasePath = config.databasePath) {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  db = new Database(databasePath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS shops (
      shop          TEXT PRIMARY KEY,         -- e.g. my-store.myshopify.com
      access_token  TEXT NOT NULL,
      scopes        TEXT,
      installed_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bundles (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      shop        TEXT NOT NULL REFERENCES shops(shop),
      handle      TEXT NOT NULL,              -- URL-safe identifier used by the storefront block
      status      TEXT NOT NULL DEFAULT 'draft',  -- draft | active | archived
      definition  TEXT NOT NULL,              -- full bundle JSON (type, products, steps, rules, template)
      created_at  TEXT DEFAULT (datetime('now')),
      updated_at  TEXT DEFAULT (datetime('now')),
      UNIQUE (shop, handle)
    );

    CREATE TABLE IF NOT EXISTS analytics_events (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      shop        TEXT NOT NULL,
      bundle_id   INTEGER NOT NULL,
      event       TEXT NOT NULL,              -- view | add_to_cart | purchase
      revenue     INTEGER DEFAULT 0,          -- minor units; set on purchase events
      meta        TEXT,                       -- JSON: locale, device, etc.
      created_at  TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_events_bundle ON analytics_events (shop, bundle_id, event);

    -- Cache of product data synced via webhooks, so storefront pricing never
    -- needs a blocking Admin API call.
    CREATE TABLE IF NOT EXISTS product_cache (
      shop        TEXT NOT NULL,
      product_id  TEXT NOT NULL,
      payload     TEXT NOT NULL,              -- JSON: title, image, variants[{id, price, sku, inventory}]
      updated_at  TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (shop, product_id)
    );
  `);

  return db;
}

function get() {
  if (!db) init();
  return db;
}

/* ------------------------------- shops ------------------------------- */

const shops = {
  upsert(shop, accessToken, scopes) {
    get()
      .prepare(
        `INSERT INTO shops (shop, access_token, scopes) VALUES (?, ?, ?)
         ON CONFLICT(shop) DO UPDATE SET access_token = excluded.access_token, scopes = excluded.scopes`
      )
      .run(shop, accessToken, scopes);
  },
  find(shop) {
    return get().prepare('SELECT * FROM shops WHERE shop = ?').get(shop);
  },
  remove(shop) {
    get().prepare('DELETE FROM shops WHERE shop = ?').run(shop);
  },
};

/* ------------------------------ bundles ------------------------------ */

function rowToBundle(row) {
  if (!row) return null;
  return {
    id: row.id,
    shop: row.shop,
    handle: row.handle,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...JSON.parse(row.definition),
  };
}

const bundles = {
  create(shop, handle, status, definition) {
    const result = get()
      .prepare('INSERT INTO bundles (shop, handle, status, definition) VALUES (?, ?, ?, ?)')
      .run(shop, handle, status, JSON.stringify(definition));
    return this.findById(shop, result.lastInsertRowid);
  },
  update(shop, id, status, definition) {
    get()
      .prepare(
        `UPDATE bundles SET status = ?, definition = ?, updated_at = datetime('now') WHERE shop = ? AND id = ?`
      )
      .run(status, JSON.stringify(definition), shop, id);
    return this.findById(shop, id);
  },
  findById(shop, id) {
    return rowToBundle(get().prepare('SELECT * FROM bundles WHERE shop = ? AND id = ?').get(shop, id));
  },
  findByHandle(shop, handle) {
    return rowToBundle(get().prepare('SELECT * FROM bundles WHERE shop = ? AND handle = ?').get(shop, handle));
  },
  list(shop) {
    return get().prepare('SELECT * FROM bundles WHERE shop = ? ORDER BY updated_at DESC').all(shop).map(rowToBundle);
  },
  remove(shop, id) {
    get().prepare('DELETE FROM bundles WHERE shop = ? AND id = ?').run(shop, id);
  },
};

/* ----------------------------- analytics ----------------------------- */

const analytics = {
  track(shop, bundleId, event, revenue = 0, meta = {}) {
    get()
      .prepare('INSERT INTO analytics_events (shop, bundle_id, event, revenue, meta) VALUES (?, ?, ?, ?, ?)')
      .run(shop, bundleId, event, revenue, JSON.stringify(meta));
  },
  summary(shop, bundleId) {
    const rows = get()
      .prepare(
        `SELECT event, COUNT(*) AS count, COALESCE(SUM(revenue), 0) AS revenue
         FROM analytics_events WHERE shop = ? AND bundle_id = ? GROUP BY event`
      )
      .all(shop, bundleId);
    const byEvent = Object.fromEntries(rows.map((r) => [r.event, r]));
    const views = (byEvent.view || {}).count || 0;
    const addToCarts = (byEvent.add_to_cart || {}).count || 0;
    const purchases = (byEvent.purchase || {}).count || 0;
    return {
      views,
      addToCarts,
      purchases,
      revenue: (byEvent.purchase || {}).revenue || 0,
      conversionRate: views > 0 ? +((purchases / views) * 100).toFixed(2) : 0,
    };
  },
};

/* --------------------------- product cache --------------------------- */

const productCache = {
  upsert(shop, productId, payload) {
    get()
      .prepare(
        `INSERT INTO product_cache (shop, product_id, payload) VALUES (?, ?, ?)
         ON CONFLICT(shop, product_id) DO UPDATE SET payload = excluded.payload, updated_at = datetime('now')`
      )
      .run(shop, String(productId), JSON.stringify(payload));
  },
  find(shop, productId) {
    const row = get()
      .prepare('SELECT payload FROM product_cache WHERE shop = ? AND product_id = ?')
      .get(shop, String(productId));
    return row ? JSON.parse(row.payload) : null;
  },
  findMany(shop, productIds) {
    return productIds.map((id) => ({ productId: String(id), product: this.find(shop, id) }));
  },
  remove(shop, productId) {
    get().prepare('DELETE FROM product_cache WHERE shop = ? AND product_id = ?').run(shop, String(productId));
  },
};

module.exports = { init, get, shops, bundles, analytics, productCache };
