/**
 * Webhook handlers. Mounted with express.raw() so HMAC verification runs
 * against the exact bytes Shopify signed. Always returns 200 quickly after
 * verification — processing failures are logged, not surfaced, so Shopify
 * doesn't disable the subscription.
 */

'use strict';

const express = require('express');
const { config } = require('../config');
const { shops, productCache, analytics, bundles } = require('../db');
const { verifyWebhookHmac } = require('../lib/hmac');
const { toMinorUnits } = require('../lib/shopify-client');

const router = express.Router();

router.use(express.raw({ type: 'application/json' }));

router.use((req, res, next) => {
  const hmac = req.get('X-Shopify-Hmac-Sha256');
  if (!verifyWebhookHmac(req.body, hmac, config.apiSecret)) {
    return res.status(401).send('HMAC verification failed');
  }
  req.shop = req.get('X-Shopify-Shop-Domain');
  try {
    req.payload = JSON.parse(req.body.toString('utf8'));
  } catch {
    return res.status(400).send('Invalid JSON');
  }
  next();
});

/** Keep the product cache in sync as products change. */
router.post('/products-update', (req, res) => {
  res.status(200).end();
  try {
    const p = req.payload;
    productCache.upsert(req.shop, p.id, {
      productId: String(p.id),
      title: p.title,
      handle: p.handle,
      image: p.image ? p.image.src : null,
      imageAlt: p.image ? p.image.alt : null,
      variants: (p.variants || []).map((v) => ({
        variantId: String(v.id),
        title: v.title,
        sku: v.sku,
        price: toMinorUnits(v.price),
        availableForSale: true, // REST payload lacks this; inventory check below still applies
        inventoryQuantity: v.inventory_quantity != null ? v.inventory_quantity : null,
        image: null,
      })),
    });
  } catch (err) {
    console.error('[webhooks] products-update failed:', err.message);
  }
});

router.post('/products-delete', (req, res) => {
  res.status(200).end();
  try {
    productCache.remove(req.shop, req.payload.id);
  } catch (err) {
    console.error('[webhooks] products-delete failed:', err.message);
  }
});

/**
 * Attribute revenue to bundles when orders are created. Line items carry
 * `_bundle_id` properties set at add-to-cart time.
 */
router.post('/orders-create', (req, res) => {
  res.status(200).end();
  try {
    const order = req.payload;
    const byBundle = new Map();
    for (const item of order.line_items || []) {
      const prop = (item.properties || []).find((pr) => pr.name === '_bundle_id');
      if (!prop) continue;
      const bundleId = Number(prop.value);
      const revenue = toMinorUnits(item.price) * item.quantity;
      byBundle.set(bundleId, (byBundle.get(bundleId) || 0) + revenue);
    }
    for (const [bundleId, revenue] of byBundle) {
      if (bundles.findById(req.shop, bundleId)) {
        analytics.track(req.shop, bundleId, 'purchase', revenue, { orderId: order.id });
      }
    }
  } catch (err) {
    console.error('[webhooks] orders-create failed:', err.message);
  }
});

/** GDPR-friendly cleanup on uninstall. */
router.post('/app-uninstalled', (req, res) => {
  res.status(200).end();
  try {
    shops.remove(req.shop);
  } catch (err) {
    console.error('[webhooks] app-uninstalled failed:', err.message);
  }
});

module.exports = router;
