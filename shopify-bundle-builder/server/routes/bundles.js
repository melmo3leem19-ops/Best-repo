/**
 * Admin API — bundle CRUD + product search + analytics, consumed by the
 * embedded admin panel (admin/). All routes are mounted behind verifyAdmin.
 */

'use strict';

const express = require('express');
const { bundles, analytics, productCache } = require('../db');
const { validateBundleDefinition } = require('../lib/bundle-validator');
const { ShopifyClient } = require('../lib/shopify-client');

const router = express.Router();

function toHandle(title) {
  return String(title)
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-') // keep Arabic/Unicode letters, hyphenate the rest
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || `bundle-${Date.now()}`;
}

/** Strip server-managed fields from a request body to get the stored definition. */
function toDefinition(body) {
  const definition = { ...body };
  for (const key of ['id', 'shop', 'handle', 'status', 'createdAt', 'updatedAt']) delete definition[key];
  return definition;
}

router.get('/bundles', (req, res) => {
  const list = bundles.list(req.shop).map((b) => ({
    ...b,
    analytics: analytics.summary(req.shop, b.id),
  }));
  res.json({ bundles: list });
});

router.get('/bundles/:id', (req, res) => {
  const bundle = bundles.findById(req.shop, Number(req.params.id));
  if (!bundle) return res.status(404).json({ error: 'Bundle not found' });
  res.json({ bundle, analytics: analytics.summary(req.shop, bundle.id) });
});

router.post('/bundles', async (req, res) => {
  const definition = toDefinition(req.body);
  const check = validateBundleDefinition(definition);
  if (!check.valid) return res.status(422).json({ errors: check.errors });

  const handle = req.body.handle ? toHandle(req.body.handle) : toHandle(definition.title);
  if (bundles.findByHandle(req.shop, handle)) {
    return res.status(409).json({ errors: [`handle "${handle}" already exists`] });
  }

  await warmProductCache(req, definition);
  const bundle = bundles.create(req.shop, handle, req.body.status || 'draft', definition);
  res.status(201).json({ bundle });
});

router.put('/bundles/:id', async (req, res) => {
  const existing = bundles.findById(req.shop, Number(req.params.id));
  if (!existing) return res.status(404).json({ error: 'Bundle not found' });

  const definition = toDefinition(req.body);
  const check = validateBundleDefinition(definition);
  if (!check.valid) return res.status(422).json({ errors: check.errors });

  await warmProductCache(req, definition);
  const bundle = bundles.update(req.shop, existing.id, req.body.status || existing.status, definition);
  res.json({ bundle });
});

/** Toggle active/draft without resubmitting the whole definition. */
router.post('/bundles/:id/status', (req, res) => {
  const existing = bundles.findById(req.shop, Number(req.params.id));
  if (!existing) return res.status(404).json({ error: 'Bundle not found' });
  const status = req.body.status;
  if (!['draft', 'active', 'archived'].includes(status)) {
    return res.status(422).json({ error: 'status must be draft, active or archived' });
  }
  res.json({ bundle: bundles.update(req.shop, existing.id, status, toDefinition(existing)) });
});

router.delete('/bundles/:id', (req, res) => {
  bundles.remove(req.shop, Number(req.params.id));
  res.status(204).end();
});

router.get('/bundles/:id/analytics', (req, res) => {
  res.json({ analytics: analytics.summary(req.shop, Number(req.params.id)) });
});

/** Product search for the admin product picker. */
router.get('/products/search', async (req, res) => {
  try {
    const client = new ShopifyClient(req.shop, req.shopRecord.access_token);
    const data = await client.graphql(
      `query SearchProducts($query: String!) {
        products(first: 20, query: $query) {
          nodes {
            id title handle
            featuredImage { url }
            variants(first: 100) { nodes { id title sku price inventoryQuantity } }
          }
        }
      }`,
      { query: req.query.q || '' }
    );
    res.json({ products: data.products.nodes });
  } catch (err) {
    console.error('[bundles] product search failed:', err.message);
    res.status(502).json({ error: 'Product search failed' });
  }
});

/** Pre-fetch product data so the storefront never waits on the Admin API. */
async function warmProductCache(req, definition) {
  try {
    const ids = [...new Set((definition.products || []).map((p) => String(p.productId)))];
    if (ids.length === 0) return;
    const client = new ShopifyClient(req.shop, req.shopRecord.access_token);
    const products = await client.getProducts(ids);
    for (const product of products) productCache.upsert(req.shop, product.productId, product);
  } catch (err) {
    // Non-fatal: the storefront route falls back to a live fetch.
    console.error('[bundles] cache warm failed:', err.message);
  }
}

module.exports = router;
