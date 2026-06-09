/**
 * Minimal Shopify Admin API client (GraphQL-first, REST fallback) using
 * the built-in fetch (Node >= 18). One instance per shop+token pair.
 *
 * Handles:
 *  - rate limiting (retries on 429 / THROTTLED with backoff)
 *  - product + inventory reads used by the bundle sync
 *  - discount code creation used at add-to-cart time
 */

'use strict';

const { config } = require('../config');

const MAX_RETRIES = 3;

class ShopifyClient {
  constructor(shop, accessToken) {
    this.shop = shop;
    this.accessToken = accessToken;
    this.base = `https://${shop}/admin/api/${config.apiVersion}`;
  }

  async graphql(query, variables = {}) {
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(`${this.base}/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': this.accessToken,
        },
        body: JSON.stringify({ query, variables }),
      });

      if (res.status === 429 && attempt < MAX_RETRIES) {
        await sleep(1000 * 2 ** attempt);
        continue;
      }
      if (!res.ok) throw new Error(`Shopify GraphQL HTTP ${res.status}`);

      const body = await res.json();
      const throttled = (body.errors || []).some((e) => e.extensions && e.extensions.code === 'THROTTLED');
      if (throttled && attempt < MAX_RETRIES) {
        await sleep(1000 * 2 ** attempt);
        continue;
      }
      if (body.errors && body.errors.length > 0) {
        throw new Error(`Shopify GraphQL error: ${JSON.stringify(body.errors)}`);
      }
      return body.data;
    }
  }

  /**
   * Fetch products with variants, prices, images and inventory in one query.
   * Prices are returned in minor units (cents) to match the discount engine.
   */
  async getProducts(productIds) {
    const gids = productIds.map((id) => `gid://shopify/Product/${id}`);
    const data = await this.graphql(
      `query BundleProducts($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on Product {
            id
            title
            handle
            featuredImage { url altText }
            variants(first: 100) {
              nodes {
                id
                title
                sku
                price
                availableForSale
                inventoryQuantity
                image { url }
              }
            }
          }
        }
      }`,
      { ids: gids }
    );

    return (data.nodes || [])
      .filter(Boolean)
      .map((p) => ({
        productId: gidToId(p.id),
        title: p.title,
        handle: p.handle,
        image: p.featuredImage ? p.featuredImage.url : null,
        imageAlt: p.featuredImage ? p.featuredImage.altText : null,
        variants: p.variants.nodes.map((v) => ({
          variantId: gidToId(v.id),
          title: v.title,
          sku: v.sku,
          price: toMinorUnits(v.price),
          availableForSale: v.availableForSale,
          inventoryQuantity: v.inventoryQuantity,
          image: v.image ? v.image.url : null,
        })),
      }));
  }

  /**
   * Create a one-time, single-use discount code for a validated bundle.
   * Applied by the storefront before checkout so the discount survives into
   * Shopify's native checkout with zero hacks.
   */
  async createBundleDiscountCode({ code, amount, currencyCode, variantIds }) {
    const data = await this.graphql(
      `mutation CreateBundleCode($input: DiscountCodeBasicInput!) {
        discountCodeBasicCreate(basicCodeDiscount: $input) {
          codeDiscountNode { id }
          userErrors { field message }
        }
      }`,
      {
        input: {
          title: `Bundle ${code}`,
          code,
          startsAt: new Date().toISOString(),
          usageLimit: 1,
          appliesOncePerCustomer: false,
          customerSelection: { all: true },
          customerGets: {
            value: { discountAmount: { amount: (amount / 100).toFixed(2), appliesOnEachItem: false } },
            items: variantIds && variantIds.length > 0
              ? { products: { productVariantsToAdd: variantIds.map((id) => `gid://shopify/ProductVariant/${id}`) } }
              : { all: true },
          },
        },
      }
    );

    const result = data.discountCodeBasicCreate;
    if (result.userErrors && result.userErrors.length > 0) {
      throw new Error(`Discount creation failed: ${JSON.stringify(result.userErrors)}`);
    }
    return { id: result.codeDiscountNode.id, code, amount, currencyCode };
  }

  /** Register a webhook subscription (idempotent on Shopify's side per topic+address). */
  async registerWebhook(topic, address) {
    const data = await this.graphql(
      `mutation RegisterWebhook($topic: WebhookSubscriptionTopic!, $sub: WebhookSubscriptionInput!) {
        webhookSubscriptionCreate(topic: $topic, webhookSubscription: $sub) {
          webhookSubscription { id }
          userErrors { field message }
        }
      }`,
      { topic, sub: { callbackUrl: address, format: 'JSON' } }
    );
    const errors = data.webhookSubscriptionCreate.userErrors || [];
    // "address has already been taken" means it's already registered — fine.
    const realErrors = errors.filter((e) => !/taken/i.test(e.message));
    if (realErrors.length > 0) {
      throw new Error(`Webhook registration failed for ${topic}: ${JSON.stringify(realErrors)}`);
    }
  }
}

function gidToId(gid) {
  return String(gid).split('/').pop();
}

/** "12.50" -> 1250 */
function toMinorUnits(decimalString) {
  return Math.round(parseFloat(decimalString) * 100);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { ShopifyClient, gidToId, toMinorUnits };
