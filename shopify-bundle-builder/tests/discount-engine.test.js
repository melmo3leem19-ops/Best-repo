'use strict';

const assert = require('assert');
const { calculatePricing, nextTierHint } = require('../server/lib/discount-engine');

function sel(price, quantity, extra) {
  return Object.assign({ productId: 'p1', variantId: 'v1', price, quantity }, extra);
}

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

console.log('discount-engine');

test('empty selections cost nothing', () => {
  const result = calculatePricing({ discountRules: [] }, []);
  assert.deepStrictEqual(result, { subtotal: 0, discount: 0, total: 0, appliedRules: [], freeGifts: [] });
});

test('no rules: total equals subtotal', () => {
  const result = calculatePricing({ discountRules: [] }, [sel(1000, 2)]);
  assert.strictEqual(result.subtotal, 2000);
  assert.strictEqual(result.total, 2000);
});

test('BOGO discounts the cheapest unit', () => {
  const bundle = { discountRules: [{ type: 'bogo', buyQty: 1, getQty: 1, discountPercent: 100 }] };
  const result = calculatePricing(bundle, [
    sel(1000, 1, { variantId: 'a' }),
    sel(500, 1, { variantId: 'b' }),
  ]);
  assert.strictEqual(result.discount, 500); // cheaper item free
  assert.strictEqual(result.total, 1000);
});

test('BOGO applies per complete group', () => {
  const bundle = { discountRules: [{ type: 'bogo', buyQty: 1, getQty: 1, discountPercent: 100 }] };
  const result = calculatePricing(bundle, [sel(1000, 4)]);
  assert.strictEqual(result.discount, 2000); // 2 of 4 units free
});

test('BOGO with partial discount percent', () => {
  const bundle = { discountRules: [{ type: 'bogo', buyQty: 1, getQty: 1, discountPercent: 50 }] };
  const result = calculatePricing(bundle, [sel(1000, 2)]);
  assert.strictEqual(result.discount, 500);
});

test('buy X get Y requires the buy quantity', () => {
  const rule = { type: 'buy_x_get_y', buyProductIds: ['p1'], getProductIds: ['p2'], buyQty: 2, getQty: 1, discountPercent: 100 };
  const below = calculatePricing({ discountRules: [rule] }, [
    sel(1000, 1),
    sel(400, 1, { productId: 'p2', variantId: 'v2' }),
  ]);
  assert.strictEqual(below.discount, 0);

  const met = calculatePricing({ discountRules: [rule] }, [
    sel(1000, 2),
    sel(400, 1, { productId: 'p2', variantId: 'v2' }),
  ]);
  assert.strictEqual(met.discount, 400);
});

test('buy X get Y with repeat applies multiple times', () => {
  const rule = { type: 'buy_x_get_y', buyProductIds: ['p1'], getProductIds: ['p2'], buyQty: 1, getQty: 1, discountPercent: 100, repeat: true };
  const result = calculatePricing({ discountRules: [rule] }, [
    sel(1000, 2),
    sel(400, 2, { productId: 'p2', variantId: 'v2' }),
  ]);
  assert.strictEqual(result.discount, 800);
});

test('tiered picks the highest matching tier', () => {
  const bundle = {
    discountRules: [{ type: 'tiered', tiers: [{ minQty: 2, discountPercent: 10 }, { minQty: 4, discountPercent: 20 }] }],
  };
  assert.strictEqual(calculatePricing(bundle, [sel(1000, 1)]).discount, 0);
  assert.strictEqual(calculatePricing(bundle, [sel(1000, 2)]).discount, 200);
  assert.strictEqual(calculatePricing(bundle, [sel(1000, 5)]).discount, 1000);
});

test('volume reprices each unit at the tier price', () => {
  const bundle = { discountRules: [{ type: 'volume', tiers: [{ minQty: 3, unitPrice: 800 }] }] };
  const result = calculatePricing(bundle, [sel(1000, 3)]);
  assert.strictEqual(result.discount, 600); // 3000 -> 2400
  assert.strictEqual(result.total, 2400);
});

test('fixed price sells the bundle at the configured price', () => {
  const bundle = { discountRules: [{ type: 'fixed_price', price: 2500 }] };
  const result = calculatePricing(bundle, [sel(1000, 3)]);
  assert.strictEqual(result.total, 2500);
});

test('fixed price never increases the total', () => {
  const bundle = { discountRules: [{ type: 'fixed_price', price: 9900 }] };
  const result = calculatePricing(bundle, [sel(1000, 3)]);
  assert.strictEqual(result.discount, 0);
  assert.strictEqual(result.total, 3000);
});

test('progressive discounts by completed steps', () => {
  const bundle = {
    discountRules: [{ type: 'progressive', steps: [{ minSteps: 2, discountPercent: 10 }, { minSteps: 3, discountPercent: 20 }] }],
  };
  const twoSteps = calculatePricing(bundle, [sel(1000, 1, { step: 0 }), sel(1000, 1, { step: 1 })]);
  assert.strictEqual(twoSteps.discount, 200);
  const threeSteps = calculatePricing(bundle, [
    sel(1000, 1, { step: 0 }),
    sel(1000, 1, { step: 1 }),
    sel(1000, 1, { step: 2 }),
  ]);
  assert.strictEqual(threeSteps.discount, 600);
});

test('free gift triggers on subtotal threshold', () => {
  const bundle = { discountRules: [{ type: 'free_gift', minSubtotal: 5000, giftVariantId: 'g1' }] };
  assert.strictEqual(calculatePricing(bundle, [sel(1000, 2)]).freeGifts.length, 0);
  const result = calculatePricing(bundle, [sel(1000, 5)]);
  assert.strictEqual(result.freeGifts.length, 1);
  assert.strictEqual(result.freeGifts[0].variantId, 'g1');
  assert.strictEqual(result.discount, 0); // gift doesn't change item prices
});

test('best stacking picks the single largest discount', () => {
  const bundle = {
    discountStacking: 'best',
    discountRules: [
      { type: 'tiered', tiers: [{ minQty: 1, discountPercent: 10 }] },
      { type: 'fixed_price', price: 1500 },
    ],
  };
  const result = calculatePricing(bundle, [sel(1000, 3)]); // 10% = 300 vs fixed = 1500 off
  assert.strictEqual(result.discount, 1500);
  assert.strictEqual(result.appliedRules.length, 1);
});

test('stack mode sums rule discounts but never exceeds subtotal', () => {
  const bundle = {
    discountStacking: 'stack',
    discountRules: [
      { type: 'tiered', tiers: [{ minQty: 1, discountPercent: 60 }] },
      { type: 'tiered', tiers: [{ minQty: 1, discountPercent: 60 }] },
    ],
  };
  const result = calculatePricing(bundle, [sel(1000, 1)]);
  assert.strictEqual(result.discount, 1000); // capped at subtotal
  assert.strictEqual(result.total, 0);
});

test('disabled rules are skipped', () => {
  const bundle = { discountRules: [{ type: 'fixed_price', price: 100, enabled: false }] };
  assert.strictEqual(calculatePricing(bundle, [sel(1000, 1)]).discount, 0);
});

test('nextTierHint reports the upsell distance', () => {
  const bundle = { discountRules: [{ type: 'tiered', tiers: [{ minQty: 5, discountPercent: 15 }] }] };
  const hint = nextTierHint(bundle, [sel(1000, 3)]);
  assert.deepStrictEqual(hint, { itemsToAdd: 2, discountPercent: 15, unitPrice: null });
  assert.strictEqual(nextTierHint(bundle, [sel(1000, 5)]), null);
});

console.log(`  ${passed} passed`);
