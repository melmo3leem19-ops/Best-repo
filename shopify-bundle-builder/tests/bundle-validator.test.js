'use strict';

const assert = require('assert');
const { validateSelections, validateBundleDefinition } = require('../server/lib/bundle-validator');

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

function activeBundle(overrides) {
  return Object.assign(
    {
      status: 'active',
      type: 'mix_match',
      title: 'Test',
      products: [{ productId: 'p1' }, { productId: 'p2' }],
      rules: {},
    },
    overrides
  );
}

function sel(productId, quantity, extra) {
  return Object.assign({ productId, variantId: 'v-' + productId, quantity }, extra);
}

console.log('bundle-validator');

test('valid selection passes', () => {
  const result = validateSelections(activeBundle(), [sel('p1', 1)]);
  assert.strictEqual(result.valid, true);
});

test('inactive bundle is rejected', () => {
  const result = validateSelections(activeBundle({ status: 'draft' }), [sel('p1', 1)]);
  assert.ok(result.errors.some((e) => e.code === 'BUNDLE_INACTIVE'));
});

test('min items enforced with localized message key', () => {
  const result = validateSelections(activeBundle({ rules: { minItems: 3 } }), [sel('p1', 1)]);
  const err = result.errors.find((e) => e.code === 'MIN_ITEMS');
  assert.ok(err);
  assert.strictEqual(err.messageKey, 'errors.min_items');
  assert.deepStrictEqual(err.params, { min: 3, current: 1 });
});

test('max items enforced', () => {
  const result = validateSelections(activeBundle({ rules: { maxItems: 2 } }), [sel('p1', 3)]);
  assert.ok(result.errors.some((e) => e.code === 'MAX_ITEMS'));
});

test('products outside the bundle are rejected', () => {
  const result = validateSelections(activeBundle(), [sel('intruder', 1)]);
  assert.ok(result.errors.some((e) => e.code === 'PRODUCT_NOT_IN_BUNDLE'));
});

test('per-product quantity cap enforced', () => {
  const bundle = activeBundle({ products: [{ productId: 'p1', maxQuantity: 2 }] });
  const result = validateSelections(bundle, [sel('p1', 3)]);
  assert.ok(result.errors.some((e) => e.code === 'PRODUCT_MAX_QTY'));
});

test('step min/max enforced for box builder', () => {
  const bundle = activeBundle({
    type: 'box_builder',
    steps: [{ position: 0, title: 'Pick teas', minItems: 2, maxItems: 4 }],
  });
  const tooFew = validateSelections(bundle, [sel('p1', 1, { step: 0 })]);
  assert.ok(tooFew.errors.some((e) => e.code === 'STEP_MIN_ITEMS'));
  const tooMany = validateSelections(bundle, [sel('p1', 5, { step: 0 })]);
  assert.ok(tooMany.errors.some((e) => e.code === 'STEP_MAX_ITEMS'));
});

test('fixed bundles must match configured quantities exactly', () => {
  const bundle = activeBundle({ type: 'fixed', products: [{ productId: 'p1', quantity: 2 }] });
  assert.strictEqual(validateSelections(bundle, [sel('p1', 2)]).valid, true);
  const wrong = validateSelections(bundle, [sel('p1', 1)]);
  assert.ok(wrong.errors.some((e) => e.code === 'FIXED_BUNDLE_MISMATCH'));
});

test('definition validation catches missing fields', () => {
  const result = validateBundleDefinition({ type: 'nope', products: [] });
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some((e) => /title/.test(e)));
  assert.ok(result.errors.some((e) => /type/.test(e)));
  assert.ok(result.errors.some((e) => /product/.test(e)));
});

test('definition validation checks rule shapes', () => {
  const result = validateBundleDefinition({
    title: 'X',
    type: 'box_builder',
    products: [{ productId: 'p1' }],
    steps: [],
    discountRules: [{ type: 'fixed_price' }, { type: 'tiered' }, { type: 'free_gift' }],
  });
  assert.ok(result.errors.some((e) => /box_builder/.test(e)));
  assert.ok(result.errors.some((e) => /fixed_price/.test(e)));
  assert.ok(result.errors.some((e) => /tiered/.test(e)));
  assert.ok(result.errors.some((e) => /giftVariantId/.test(e)));
});

test('min cannot exceed max', () => {
  const result = validateBundleDefinition({
    title: 'X',
    type: 'mix_match',
    products: [{ productId: 'p1' }],
    rules: { minItems: 5, maxItems: 2 },
  });
  assert.ok(result.errors.some((e) => /minItems/.test(e)));
});

console.log(`  ${passed} passed`);
