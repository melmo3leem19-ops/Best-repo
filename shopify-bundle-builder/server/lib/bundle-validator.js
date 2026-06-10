/**
 * Bundle Validator — pure functions, no I/O.
 *
 * Validates a shopper's selections against a bundle's rules before pricing
 * and before anything is added to the cart. Returns structured errors with
 * i18n keys so the storefront can show localized (Arabic/English) messages.
 */

'use strict';

const BUNDLE_TYPES = ['mix_match', 'byob', 'box_builder', 'fixed', 'infinite_options', 'combo'];

/**
 * @param {object} bundle
 * @param {Array<{productId:string, variantId:string, quantity:number, step?:number}>} selections
 * @returns {{ valid: boolean, errors: Array<{code:string, messageKey:string, params?:object}> }}
 */
function validateSelections(bundle, selections) {
  const errors = [];
  const totalQty = selections.reduce((sum, s) => sum + s.quantity, 0);
  const rules = bundle.rules || {};

  if (bundle.status !== 'active') {
    errors.push({ code: 'BUNDLE_INACTIVE', messageKey: 'errors.bundle_inactive' });
  }

  if (rules.minItems != null && totalQty < rules.minItems) {
    errors.push({
      code: 'MIN_ITEMS',
      messageKey: 'errors.min_items',
      params: { min: rules.minItems, current: totalQty },
    });
  }

  if (rules.maxItems != null && totalQty > rules.maxItems) {
    errors.push({
      code: 'MAX_ITEMS',
      messageKey: 'errors.max_items',
      params: { max: rules.maxItems, current: totalQty },
    });
  }

  // Per-product allowlist: every selection must reference a product configured
  // on the bundle (fixed bundles are implicitly strict).
  const allowed = new Set((bundle.products || []).map((p) => String(p.productId)));
  if (allowed.size > 0) {
    for (const s of selections) {
      if (!allowed.has(String(s.productId))) {
        errors.push({
          code: 'PRODUCT_NOT_IN_BUNDLE',
          messageKey: 'errors.product_not_in_bundle',
          params: { productId: s.productId },
        });
      }
    }
  }

  // Per-product quantity caps.
  for (const p of bundle.products || []) {
    if (p.maxQuantity == null) continue;
    const qty = selections
      .filter((s) => String(s.productId) === String(p.productId))
      .reduce((sum, s) => sum + s.quantity, 0);
    if (qty > p.maxQuantity) {
      errors.push({
        code: 'PRODUCT_MAX_QTY',
        messageKey: 'errors.product_max_qty',
        params: { productId: p.productId, max: p.maxQuantity },
      });
    }
  }

  // Step rules for box-builder / multi-step flows.
  for (const step of bundle.steps || []) {
    const stepQty = selections
      .filter((s) => s.step === step.position)
      .reduce((sum, s) => sum + s.quantity, 0);
    if (step.minItems != null && stepQty < step.minItems) {
      errors.push({
        code: 'STEP_MIN_ITEMS',
        messageKey: 'errors.step_min_items',
        params: { step: step.position, title: step.title, min: step.minItems, current: stepQty },
      });
    }
    if (step.maxItems != null && stepQty > step.maxItems) {
      errors.push({
        code: 'STEP_MAX_ITEMS',
        messageKey: 'errors.step_max_items',
        params: { step: step.position, title: step.title, max: step.maxItems, current: stepQty },
      });
    }
  }

  // Fixed bundles must be bought exactly as configured.
  if (bundle.type === 'fixed') {
    for (const p of bundle.products || []) {
      const qty = selections
        .filter((s) => String(s.productId) === String(p.productId))
        .reduce((sum, s) => sum + s.quantity, 0);
      const expected = p.quantity || 1;
      if (qty !== expected) {
        errors.push({
          code: 'FIXED_BUNDLE_MISMATCH',
          messageKey: 'errors.fixed_bundle_mismatch',
          params: { productId: p.productId, expected, current: qty },
        });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a bundle definition coming from the admin panel.
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateBundleDefinition(bundle) {
  const errors = [];

  if (!bundle.title || !String(bundle.title).trim()) errors.push('title is required');
  if (!BUNDLE_TYPES.includes(bundle.type)) {
    errors.push(`type must be one of: ${BUNDLE_TYPES.join(', ')}`);
  }
  if (!Array.isArray(bundle.products) || bundle.products.length === 0) {
    errors.push('at least one product is required');
  }
  const rules = bundle.rules || {};
  if (rules.minItems != null && rules.maxItems != null && rules.minItems > rules.maxItems) {
    errors.push('rules.minItems cannot exceed rules.maxItems');
  }
  if (bundle.type === 'box_builder' && (!Array.isArray(bundle.steps) || bundle.steps.length === 0)) {
    errors.push('box_builder bundles require at least one step');
  }
  for (const rule of bundle.discountRules || []) {
    if (rule.type === 'fixed_price' && (rule.price == null || rule.price < 0)) {
      errors.push('fixed_price rule requires a non-negative price');
    }
    if ((rule.type === 'tiered' || rule.type === 'volume') && (!Array.isArray(rule.tiers) || rule.tiers.length === 0)) {
      errors.push(`${rule.type} rule requires at least one tier`);
    }
    if (rule.type === 'free_gift' && !rule.giftVariantId) {
      errors.push('free_gift rule requires giftVariantId');
    }
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { validateSelections, validateBundleDefinition, BUNDLE_TYPES };
