# Phase 5 — Variant Picker Fix (Cards Picker: Discount Display + Option Grouping)

Theme: **Copy of Copy of v4** (unpublished, `gid://shopify/OnlineStoreTheme/187213774882`) — almoallemmill.com, AR (RTL, primary) / EN, KWD (3 decimals).
Date: 2026-06-11.

## 1. Actual option structure of the reference product

`products(query: "handle:ملبس-كاكاو-أزرق")` → `gid://shopify/Product/8458726932514` "ملبس كاكاو أزرق":

| Option (position) | Values |
|---|---|
| 1 — الحجم | كبير، صغير |
| 2 — الكمية | 500 غرام، 250 غرام، 750 غرام، 1 كيلو |

8 variants. Exactly one is discounted: **كبير / 1 كيلو** — price 4.500 KWD, compare-at 6.500 KWD (true discount 30.77%).

So this is a **genuine 2-option product** — no admin restructuring needed for this product. (Other products that pack sizes *and* weights into a single option would still need the merchant to split them into two real options in admin before grouping can apply; the theme now handles both shapes correctly.)

## 2. Root causes

**Complaint 1 — cramped discount stack.** `snippets/variant-cards-picker.liquid` rendered `.vc__pricing` as a *column* flex: a `.vc__compare-row` (hardcoded-Arabic「خصم NN%」pill + struck compare-at) stacked **above** the sale price, while non-discounted cards rendered a single inline price — two visually different card anatomies. The percent also used integer Liquid division (`times: 100 | divided_by:` → truncation: 30 instead of 31) and the「خصم」string was untranslated (broken on the EN storefront). Additionally, on this unpublished theme the template had `"show_discount_badge": false`, so the percent did not show at all.

**Complaint 2 — two indistinguishable lists.** The snippet *did* emit one `<fieldset>` per option, but each legend was `visually-hidden` and every option rendered the identical full-width card list with zero spacing between fieldsets. With 2 options the buyer saw one continuous list of 6 cards with two "selected" highlights and no headers.

## 3. What changed

### Files (theme + mirror `almoallem-theme/`, byte-identical)

| File | Change |
|---|---|
| `snippets/variant-cards-picker.liquid` | Inline price row; per-option group headers; pills style for options 2+; a11y price labels; CSS for legends/pills/row pricing |
| `blocks/variant-cards-picker.liquid` | Two new select settings (`first_option_style` default `cards`, `other_options_style` default `pills`) + pass-through to the snippet |
| `templates/product.json` | `variant_cards_picker_i7cf8t.settings.show_discount_badge: false → true` (enables the percent chip the merchant asked for) |

Not touched (per constraints): `locales/*`, `config/settings_schema.json`, `sections/featured-products.liquid`, `snippets/variant-main-picker.liquid`, `blocks/variant-picker.liquid`, `assets/variant-picker.js`.

### Price display — before → after (discounted card)

Before (stacked, inconsistent):

```html
<div class="vc__pricing">            <!-- flex column -->
  <div class="vc__compare-row">
    <span class="vc__disc">خصم 30%</span>
    <s class="vc__compare">6.500 KWD</s>
  </div>
  <span class="vc__price">4.500 KWD</span>
</div>
```

After (one inline row, consistent with simple cards, SR-labelled like `snippets/price.liquid`):

```html
<div class="vc__pricing">            <!-- flex row, wrap, baseline -->
  <span class="vc__price-group" role="group">
    <span class="visually-hidden">{{ 'content.price_sale' | t }}&nbsp;</span>
    <span class="vc__price">4.500 KWD</span>
  </span>
  <span class="vc__price-group" role="group">
    <span class="visually-hidden">{{ 'content.price_regular' | t }}&nbsp;</span>
    <s class="vc__compare">6.500 KWD</s>
  </span>
  <span class="vc__disc">
    <span class="visually-hidden">{{ 'content.discount' | t }}&nbsp;</span>
    <bdi dir="ltr">-31%</bdi>
  </span>
</div>
```

Non-discounted cards still render the single `<span class="vc__price">` exactly as before. `.vc__info` is now row+wrap for all cards, so a discounted card reads as one line: value title … sale + struck compare + chip (wrapping gracefully on narrow screens). All amounts keep going through the theme's `| money` filter — KWD 3-decimal formatting untouched, no hand-formatting.

**Discount percent computation** (no new locale keys): `compare_at | minus: price | times: 100.0 | divided_by: compare_at | round` → float division then round, e.g. (6500−4500)×100.0÷6500 = 30.77 → **-31%** (the old code truncated to 30). Accessible name reuses existing `content.discount` (الخصم / Discount). No discount-percent key with a placeholder exists in either locale file (verified), hence the Liquid-computed `-NN%` rendered inside `<bdi dir="ltr">`.

### Option grouping — before → after

- `option_count = product.options_with_values.size`.
- `option_count == 1`: legend stays `visually-hidden`, single flat card list — **markup byte-identical to before** for this case (zero visual regression; only the discounted-card price row is intentionally improved everywhere).
- `option_count > 1`: every fieldset gets a **visible** `<legend class="vc-fieldset__legend">` with the option name (الحجم / الكمية), fieldsets are separated by `margin-block-start: 20px`, and:
  - option 1 → existing **card** style (unchanged),
  - options 2+ → new compact **pill** style (`.vc-pill`: inline-flex, wrap, 999px radius, min-height 40px ≥ WCAG 2.2 target size, text-only value).
- Merchant-configurable per group via the new block settings **First option style** (default Cards) and **Other options style** (default Pills) — the schema structure made this clean. For ملبس كاكاو أزرق the merchant may prefer flipping them (الحجم as pills, الكمية as cards) since الكمية is the price-driving option and cards show per-value prices; one click in the theme editor.
- Selected state is scoped per fieldset automatically (one `:checked` radio per `name=` group), so exactly one highlight per option group — the "two selected cards" confusion disappears.

### Backward compatibility

Existing settings (`show_compare_at`, `show_discount_badge`, `show_check`, colors, radii, paddings, badges) untouched and honored. New settings have defaults that apply without saving the block (Shopify falls back to schema defaults / snippet `| default:` guards). Single-option products: same DOM, same classes, same CSS outcomes.

## 4. RTL notes

- All new CSS uses logical properties only: `margin-block-start/-end`, no left/right (per conventions brief §5). Pre-existing `text-align: right` on `.vc__info` was deliberately left as-is to avoid regressions.
- Flex row order follows DOM in the inline direction, so in AR the sale price is rightmost, then compare-at, then chip; mirrored automatically in EN.
- The `-31%` chip is wrapped in `<bdi dir="ltr">` so the leading minus does not get bidi-reordered to `%31-` inside RTL text.
- Group legends render the raw option names (Arabic on this store) — no new translatable strings introduced.

## 5. JS contract preservation (verified by reading the JS)

`assets/variant-picker.js` (unchanged) requires — all preserved:
- `<variant-picker>` element with `data-section-id/product-id/block-id/product-url`, `ref="mainVariantPicker"`, `data-template-product-match`.
- `ref="fieldsets[]"` on each `<fieldset>` containing `<input type="radio">` children; radios keep `name`, `value`, `data-fieldset-index`, `data-input-index`, `data-input-id`, `data-option-value-id`, `data-option-available`, `data-connected-product-url`, `data-variant-id`, `data-current-checked`/`data-previous-checked`, `checked`. The input markup is now built once in a `{% capture %}` and reused by both card and pill labels, so card/pill inputs cannot drift.
- `radios[i].parentElement.offsetWidth` (pill-width CSS vars): input remains a direct child of its `<label>` in both styles.
- `selectedOption` query `'select option[selected], fieldset input:checked'` and the `<script type="application/json">` payload inside `.variant-picker__form` — unchanged.
- `assets/sticky-add-to-cart.js` uses `variant-picker[data-product-id]` and `variant-picker input:checked` values to rebuild the variant title — both intact.
- The only removed selector is `.vc__compare-row`, which was styled solely inside this snippet's own `{% stylesheet %}`; repo-wide and theme-asset greps found no other reference to any `vc*` class.

## 6. Verification results

- GraphQL ops validated with `validate_graphql_codeblocks` before execution (query + upsert mutation: VALID).
- Liquid mentally executed against the real 2-option product (both selected-variant states, incl. the discounted كبير/1كيلو path: `has_compare=true`, `show_compare_row=true`, chip `-31%`) and against the single-option path (`option_count==1` → hidden legend, cards, `vc--simple` unchanged). Unavailable values: cards `vc--unavailable`, pills `vc-pill--unavailable` (same opacity/pointer-events pattern).
- Tag balance script: doc/unless/for/if/capture/stylesheet, fieldset/label/legend all balanced.
- `templates/product.json` re-validated as JSON; transcription cross-checked: reverting the single flag reproduces the previous mirror bytes exactly.
- Upsert: `themeFilesUpsert` succeeded with empty `userErrors` for all 3 files; re-fetched each file — **byte-identical to the mirror copies**, `checksumMd5` matches local `md5sum`:
  - `snippets/variant-cards-picker.liquid` `d161f524e7fb8f16090f33f97e997baa`
  - `blocks/variant-cards-picker.liquid` `5f2f9c5f99cecfd9790f0626f649f444`
  - `templates/product.json` `03375518ccad01e740a2d3958f6746bb`

## 7. Merchant follow-ups

1. Preview the unpublished theme on `/products/ملبس-كاكاو-أزرق` (AR + EN) and decide whether الحجم/الكمية should be cards-then-pills (current default) or flipped via the block's new "First/Other option style" selects.
2. Audit other multi-value products: any product that mixes size *and* weight inside ONE option (e.g. values like "كبير 500غ") must be split into two real options in Shopify admin for grouping to apply; the picker renders such products as a single (correct) card list until then.
3. The discount chip is now ON for the product template (`show_discount_badge: true`); it can be toggled per block in the theme editor.
4. `templates/product.bands.json` uses the standard Horizon variant picker (untouched) — no action needed.
