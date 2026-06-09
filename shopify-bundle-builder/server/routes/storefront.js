/**
 * Storefront API — consumed by the theme extension widget via the Shopify
 * App Proxy (https://store.com/apps/bundle-builder/... -> this server).
 * Every request is signature-verified (verifyProxy middleware).
 *
 *   GET  /proxy/bundle/:handle   -> bundle config + live product data
 *   POST /proxy/price            -> validate selections + compute price
 *   POST /proxy/checkout         -> final validation + single-use discount code
 *   POST /proxy/track            -> analytics events (view / add_to_cart / purchase)
 */

'use strict';

const crypto = require('crypto');
const express = require('express');
const { config } = require('../config');
const { bundles, analytics, productCache } = require('../db');
const { calculatePricing, nextTierHint } = require('../lib/discount-engine');
const { validateSelections } = require('../lib/bundle-validator');
const { validateInventory } = require('../lib/inventory');
const { ShopifyClient } = require('../lib/shopify-client');

const router = express.Router();

/** Resolve products for a bundle: cache first, live Admin API on miss. */
async function resolveProducts(req, bundle) {
  const ids = [...new Set((bundle.products || []).map((p) => String(p.productId)))];
  const cached = productCache.findMany(req.shop, ids);
  const missing = cached.filter((c) => !c.product).map((c) => c.productId);

  if (missing.length > 0) {
    const client = new ShopifyClient(req.shop, req.shopRecord.access_token);
    const fetched = await client.getProducts(missing);
    for (const product of fetched) productCache.upsert(req.shop, product.productId, product);
  }
  return productCache.findMany(req.shop, ids).map((c) => c.product).filter(Boolean);
}

/**
 * Attach trusted server-side prices to client selections. The client only
 * sends IDs and quantities — prices always come from our product data so a
 * tampered request can't buy at a fake price.
 */
function priceSelections(req, bundle, rawSelections) {
  const selections = [];
  for (const raw of rawSelections || []) {
    const product = productCache.find(req.shop, raw.productId);
    const variant = product && (product.variants || []).find((v) => String(v.variantId) === String(raw.variantId));
    if (!variant) return { error: { code: 'UNKNOWN_VARIANT', variantId: raw.variantId } };
    selections.push({
      productId: String(raw.productId),
      variantId: String(raw.variantId),
      quantity: Math.max(1, parseInt(raw.quantity, 10) || 1),
      step: raw.step != null ? Number(raw.step) : undefined,
      price: variant.price,
    });
  }
  return { selections };
}

router.get('/bundle/:handle', async (req, res) => {
  try {
    const bundle = bundles.findByHandle(req.shop, req.params.handle);
    if (!bundle || bundle.status !== 'active') {
      return res.status(404).json({ error: 'Bundle not found' });
    }
    const products = await resolveProducts(req, bundle);

    // Public payload: never leak admin-only fields.
    res.json({
      // Tells the widget how to turn minor units into display amounts
      // (1000 for 3-decimal currencies like KWD, 100 otherwise).
      currency: { decimals: config.currencyDecimals, factor: config.minorUnitFactor },
      bundle: {
        id: bundle.id,
        handle: bundle.handle,
        title: bundle.title,
        description: bundle.description || '',
        type: bundle.type,
        rules: bundle.rules || {},
        steps: bundle.steps || [],
        discountRules: bundle.discountRules || [],
        discountStacking: bundle.discountStacking || 'best',
        template: bundle.template || { name: 'minimal' },
        products: (bundle.products || []).map((p) => ({
          productId: String(p.productId),
          quantity: p.quantity || null,
          maxQuantity: p.maxQuantity || null,
          step: p.step != null ? p.step : null,
        })),
      },
      products,
    });
  } catch (err) {
    console.error('[storefront] bundle load failed:', err.message);
    res.status(500).json({ error: 'Failed to load bundle' });
  }
});

router.post('/price', async (req, res) => {
  try {
    const bundle = bundles.findById(req.shop, Number(req.body.bundleId));
    if (!bundle) return res.status(404).json({ error: 'Bundle not found' });

    await resolveProducts(req, bundle); // make sure the cache is warm
    const priced = priceSelections(req, bundle, req.body.selections);
    if (priced.error) return res.status(422).json({ error: priced.error });

    const validation = validateSelections(bundle, priced.selections);
    const pricing = calculatePricing(bundle, priced.selections);

    res.json({
      valid: validation.valid,
      errors: validation.errors,
      pricing,
      nextTier: nextTierHint(bundle, priced.selections),
    });
  } catch (err) {
    console.error('[storefront] pricing failed:', err.message);
    res.status(500).json({ error: 'Pricing failed' });
  }
});

router.post('/checkout', async (req, res) => {
  try {
    const bundle = bundles.findById(req.shop, Number(req.body.bundleId));
    if (!bundle || bundle.status !== 'active') {
      return res.status(404).json({ error: 'Bundle not found' });
    }

    await resolveProducts(req, bundle);
    const priced = priceSelections(req, bundle, req.body.selections);
    if (priced.error) return res.status(422).json({ error: priced.error });

    const validation = validateSelections(bundle, priced.selections);
    if (!validation.valid) return res.status(422).json({ errors: validation.errors });

    const stock = await validateInventory(req.shop, req.shopRecord.access_token, priced.selections);
    if (!stock.ok) return res.status(409).json({ error: 'INVENTORY', issues: stock.issues });

    const pricing = calculatePricing(bundle, priced.selections);

    // Mint a single-use discount code for exactly this discount amount,
    // restricted to the bundle's variants — survives natively into checkout.
    let discountCode = null;
    if (pricing.discount > 0) {
      const client = new ShopifyClient(req.shop, req.shopRecord.access_token);
      const code = `BNDL-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      discountCode = await client.createBundleDiscountCode({
        code,
        amount: pricing.discount,
        currencyCode: req.body.currency || 'USD',
        variantIds: priced.selections.map((s) => s.variantId),
      });
    }

    // bundleKey groups the line items visually and in order webhooks.
    const bundleKey = `${bundle.handle}-${Date.now().toString(36)}`;
    const lineItems = priced.selections.map((s) => ({
      id: Number(s.variantId),
      quantity: s.quantity,
      properties: {
        _bundle_id: String(bundle.id),
        _bundle_key: bundleKey,
        _bundle_title: bundle.title,
      },
    }));
    for (const gift of pricing.freeGifts) {
      lineItems.push({
        id: Number(gift.variantId),
        quantity: gift.quantity,
        properties: { _bundle_id: String(bundle.id), _bundle_key: bundleKey, _bundle_free_gift: 'true' },
      });
    }

    analytics.track(req.shop, bundle.id, 'add_to_cart', 0, { locale: req.body.locale || null });

    res.json({
      pricing,
      lineItems,
      discountCode: discountCode ? discountCode.code : null,
      bundleKey,
    });
  } catch (err) {
    console.error('[storefront] checkout prep failed:', err.message);
    res.status(500).json({ error: 'Checkout preparation failed' });
  }
});

router.post('/track', (req, res) => {
  const { bundleId, event, meta } = req.body || {};
  if (!bundleId || !['view', 'add_to_cart', 'purchase'].includes(event)) {
    return res.status(422).json({ error: 'Invalid event' });
  }
  analytics.track(req.shop, Number(bundleId), event, 0, meta || {});
  res.status(204).end();
});

module.exports = router;
