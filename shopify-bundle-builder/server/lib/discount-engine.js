/**
 * Discount Engine — pure functions, no I/O.
 *
 * All money values are integers in the shop's minor currency unit (cents/halalas)
 * to avoid floating-point drift. Conversion to display strings happens at the edge.
 *
 * A bundle carries an ordered list of discount rules. Rules are evaluated in order
 * and the engine applies either the single best rule or stacks them, depending on
 * the bundle's `discountStacking` setting ("best" | "stack").
 *
 * Supported rule types:
 *   bogo            — Buy N, get M at a discount (cheapest items discounted)
 *   buy_x_get_y     — Buy qty of products in set X, get qty of products in set Y discounted
 *   tiered          — Buy more save more: % or fixed amount off at quantity thresholds
 *   volume          — Per-unit price drops at quantity thresholds
 *   fixed_price     — The whole bundle sells for a fixed price
 *   progressive     — Discount grows with completed steps (box-builder flows)
 *   free_gift       — Free product added when subtotal/quantity threshold is met
 */

'use strict';

/** @typedef {{ productId: string, variantId: string, price: number, quantity: number, step?: number }} Selection */

function totalQuantity(selections) {
  return selections.reduce((sum, s) => sum + s.quantity, 0);
}

function subtotal(selections) {
  return selections.reduce((sum, s) => sum + s.price * s.quantity, 0);
}

/**
 * Expand selections into one entry per unit, sorted cheapest first.
 * BOGO-style rules discount the cheapest units, which is the industry
 * convention (and what Shopify's native discounts do).
 */
function expandUnits(selections) {
  const units = [];
  for (const s of selections) {
    for (let i = 0; i < s.quantity; i++) {
      units.push({ productId: s.productId, variantId: s.variantId, price: s.price });
    }
  }
  return units.sort((a, b) => a.price - b.price);
}

function percentOff(amount, percent) {
  // Round half-up per unit so totals are stable and reproducible.
  return Math.round((amount * percent) / 100);
}

/* ----------------------------- rule evaluators ----------------------------- */

function evalBogo(rule, selections) {
  const buyQty = rule.buyQty || 1;
  const getQty = rule.getQty || 1;
  const percent = rule.discountPercent == null ? 100 : rule.discountPercent;
  const units = expandUnits(selections);
  const groupSize = buyQty + getQty;
  const groups = Math.floor(units.length / groupSize);
  if (groups === 0) return 0;

  // Cheapest `groups * getQty` units get discounted.
  const discountedUnits = units.slice(0, groups * getQty);
  return discountedUnits.reduce((sum, u) => sum + percentOff(u.price, percent), 0);
}

function evalBuyXGetY(rule, selections) {
  const buySet = new Set((rule.buyProductIds || []).map(String));
  const getSet = new Set((rule.getProductIds || []).map(String));
  const buyQtyNeeded = rule.buyQty || 1;
  const getQtyMax = rule.getQty || 1;
  const percent = rule.discountPercent == null ? 100 : rule.discountPercent;

  const buyCount = selections
    .filter((s) => buySet.has(String(s.productId)))
    .reduce((sum, s) => sum + s.quantity, 0);
  if (buyCount < buyQtyNeeded) return 0;

  const applications = rule.repeat ? Math.floor(buyCount / buyQtyNeeded) : 1;
  const maxDiscounted = applications * getQtyMax;

  const eligibleUnits = expandUnits(selections.filter((s) => getSet.has(String(s.productId))));
  return eligibleUnits
    .slice(0, maxDiscounted)
    .reduce((sum, u) => sum + percentOff(u.price, percent), 0);
}

function pickTier(tiers, qty) {
  let match = null;
  for (const tier of [...tiers].sort((a, b) => a.minQty - b.minQty)) {
    if (qty >= tier.minQty) match = tier;
  }
  return match;
}

function evalTiered(rule, selections) {
  const tier = pickTier(rule.tiers || [], totalQuantity(selections));
  if (!tier) return 0;
  if (tier.discountPercent != null) return percentOff(subtotal(selections), tier.discountPercent);
  if (tier.discountAmount != null) return Math.min(tier.discountAmount, subtotal(selections));
  return 0;
}

function evalVolume(rule, selections) {
  // Volume pricing: each unit sells at the tier's unit price.
  const qty = totalQuantity(selections);
  const tier = pickTier(rule.tiers || [], qty);
  if (!tier || tier.unitPrice == null) return 0;
  const sub = subtotal(selections);
  const target = tier.unitPrice * qty;
  return Math.max(0, sub - target);
}

function evalFixedPrice(rule, selections) {
  if (rule.price == null) return 0;
  return Math.max(0, subtotal(selections) - rule.price);
}

function evalProgressive(rule, selections) {
  // Discount based on how many distinct steps have at least one selection.
  const steps = new Set(selections.filter((s) => s.step != null).map((s) => s.step));
  const tier = pickTier(
    (rule.steps || []).map((t) => ({ ...t, minQty: t.minSteps })),
    steps.size
  );
  if (!tier || tier.discountPercent == null) return 0;
  return percentOff(subtotal(selections), tier.discountPercent);
}

function evalFreeGift(rule, selections) {
  // Free gifts don't reduce the subtotal of selected items; they add a free
  // line. The engine reports the gift so the cart layer can add it.
  const meetsAmount = rule.minSubtotal == null || subtotal(selections) >= rule.minSubtotal;
  const meetsQty = rule.minQuantity == null || totalQuantity(selections) >= rule.minQuantity;
  return meetsAmount && meetsQty ? { variantId: rule.giftVariantId, quantity: rule.giftQuantity || 1 } : null;
}

const EVALUATORS = {
  bogo: evalBogo,
  buy_x_get_y: evalBuyXGetY,
  tiered: evalTiered,
  volume: evalVolume,
  fixed_price: evalFixedPrice,
  progressive: evalProgressive,
};

/* --------------------------------- engine --------------------------------- */

/**
 * Calculate pricing for a bundle given the shopper's current selections.
 *
 * @param {object} bundle - bundle record with `discountRules` and `discountStacking`
 * @param {Selection[]} selections
 * @returns {{ subtotal:number, discount:number, total:number, appliedRules:Array, freeGifts:Array }}
 */
function calculatePricing(bundle, selections) {
  const sub = subtotal(selections);
  const rules = bundle.discountRules || [];
  const stacking = bundle.discountStacking === 'stack' ? 'stack' : 'best';

  const evaluated = [];
  const freeGifts = [];

  for (const rule of rules) {
    if (rule.enabled === false) continue;
    if (rule.type === 'free_gift') {
      const gift = evalFreeGift(rule, selections);
      if (gift) freeGifts.push({ ...gift, ruleId: rule.id || null });
      continue;
    }
    const evaluator = EVALUATORS[rule.type];
    if (!evaluator) continue;
    const amount = Math.min(evaluator(rule, selections), sub);
    if (amount > 0) {
      evaluated.push({ ruleId: rule.id || null, type: rule.type, label: rule.label || rule.type, amount });
    }
  }

  let applied = [];
  if (stacking === 'stack') {
    applied = evaluated;
  } else if (evaluated.length > 0) {
    applied = [evaluated.reduce((best, r) => (r.amount > best.amount ? r : best))];
  }

  const discount = Math.min(
    applied.reduce((sum, r) => sum + r.amount, 0),
    sub
  );

  return {
    subtotal: sub,
    discount,
    total: sub - discount,
    appliedRules: applied,
    freeGifts,
  };
}

/**
 * Compute the discount that the *next* tier would unlock — powers the
 * "Add 2 more items to save 15%" upsell nudge in the storefront UI.
 */
function nextTierHint(bundle, selections) {
  const qty = totalQuantity(selections);
  for (const rule of bundle.discountRules || []) {
    if (rule.enabled === false) continue;
    const tiers = rule.type === 'tiered' || rule.type === 'volume' ? rule.tiers : null;
    if (!tiers) continue;
    const next = [...tiers].sort((a, b) => a.minQty - b.minQty).find((t) => t.minQty > qty);
    if (next) {
      return {
        itemsToAdd: next.minQty - qty,
        discountPercent: next.discountPercent != null ? next.discountPercent : null,
        unitPrice: next.unitPrice != null ? next.unitPrice : null,
      };
    }
  }
  return null;
}

module.exports = { calculatePricing, nextTierHint, subtotal, totalQuantity };
