/**
 * Inventory validation — checks shopper selections against the webhook-fed
 * product cache, falling back to a live Admin API read when the cache is
 * cold. Keeps storefront requests fast (cache hit = no network).
 */

'use strict';

const { productCache } = require('../db');
const { ShopifyClient } = require('./shopify-client');

/**
 * @param {string} shop
 * @param {string} accessToken
 * @param {Array<{productId:string, variantId:string, quantity:number}>} selections
 * @returns {Promise<{ ok: boolean, issues: Array<{variantId:string, code:string, available?:number}> }>}
 */
async function validateInventory(shop, accessToken, selections) {
  const issues = [];
  const missing = [];

  for (const s of selections) {
    const cached = productCache.find(shop, s.productId);
    if (!cached) {
      missing.push(s.productId);
      continue;
    }
    checkVariant(cached, s, issues);
  }

  if (missing.length > 0) {
    // Cold cache: fetch live, then store for next time.
    const client = new ShopifyClient(shop, accessToken);
    const products = await client.getProducts([...new Set(missing)]);
    for (const product of products) {
      productCache.upsert(shop, product.productId, product);
    }
    for (const s of selections.filter((sel) => missing.includes(sel.productId))) {
      const product = products.find((p) => String(p.productId) === String(s.productId));
      if (!product) {
        issues.push({ variantId: s.variantId, code: 'PRODUCT_NOT_FOUND' });
        continue;
      }
      checkVariant(product, s, issues);
    }
  }

  return { ok: issues.length === 0, issues };
}

function checkVariant(product, selection, issues) {
  const variant = (product.variants || []).find((v) => String(v.variantId) === String(selection.variantId));
  if (!variant) {
    issues.push({ variantId: selection.variantId, code: 'VARIANT_NOT_FOUND' });
    return;
  }
  if (variant.availableForSale === false) {
    issues.push({ variantId: selection.variantId, code: 'NOT_AVAILABLE' });
    return;
  }
  // inventoryQuantity can be null for non-tracked items — treat as unlimited.
  if (variant.inventoryQuantity != null && variant.inventoryQuantity < selection.quantity) {
    issues.push({
      variantId: selection.variantId,
      code: 'INSUFFICIENT_STOCK',
      available: variant.inventoryQuantity,
    });
  }
}

module.exports = { validateInventory };
