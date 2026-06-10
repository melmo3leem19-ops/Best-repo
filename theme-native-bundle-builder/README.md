# Bundle Builder Pro — Theme-Native (Al Moallem Mill)

A fully theme-native bundle builder for Shopify Online Store 2.0. No app, no
external server: bundles are managed with **metaobjects**, per-product behavior
with **metafields**, presentation with **theme customizer settings**, and
checkout discounts with **native Shopify discount codes**.

Built for almoallemmill.com — Arabic (RTL) + English (LTR), KWD (3-decimal).

## What was deployed where

| Layer | Item | Location |
|---|---|---|
| Theme | `sections/bundle-builder-pro.liquid` | theme **Copy of v4** |
| Theme | `snippets/bundle-pro-card.liquid` | theme Copy of v4 |
| Theme | `assets/bundle-pro.js`, `assets/bundle-pro.css` | theme Copy of v4 |
| Theme | `templates/page.bundle-pro.json` | theme Copy of v4 |
| Admin | `bundle_v4` metaobject definition (32 fields) | Content → Metaobjects |
| Admin | 8 product metafield definitions (`bundle.*`) | Settings → Custom data → Products |
| Admin | 7 tier discount codes (SPICEBOX10/20, NUTSBOX10/20/25, HAMPER15/20) | Discounts |
| Admin | 3 sample bundles + sample product metafields | Content → Metaobjects |

The existing settings-driven `sections/bundle-builder.liquid` (and its
templates `page.bundle-builder`, `page.bundle-grid`, `page.bundle-wizard`)
was left untouched — both systems coexist. This folder is the version-controlled
source of the new files.

## How merchants create bundles

1. **Admin → Content → Metaobjects → Bundle V4 Configuration → Add entry.**
2. Fill: name (+ Arabic), description (+ Arabic), bundle type, min/max products,
   source collections, and `tier_discounts` JSON, e.g.:

   ```json
   [
     {"min_qty": 3, "discount": 10, "code": "MYBOX10", "label": "Choose 3: Save 10%", "label_ar": "اختر 3: وفر 10%"},
     {"min_qty": 5, "discount": 20, "code": "MYBOX20", "label": "Choose 5: Save 20%", "label_ar": "اختر 5: وفر 20%"}
   ]
   ```

3. **Admin → Discounts**: create one *amount off products* code per tier —
   same code name as in the JSON, percentage = tier discount, minimum quantity
   = tier `min_qty`, applies to the bundle's source collections. This is what
   makes checkout totals match the UI.
4. Set `status` = `active` (optionally start/end dates).
5. **Online Store → Pages → Add page**, theme template **bundle-pro** — or add
   the *Bundle Builder Pro* section to any existing page and pick the bundle
   in its settings.

## How merchants manage bundles

- Edit the metaobject — storefront updates immediately, no theme publish.
- `status: inactive` hides a bundle instantly; start/end dates schedule it.
- `priority` controls which bundle a section shows when none is picked
  (lowest number wins).
- Unlimited bundles: every page/section can target a different metaobject.

## How customers use bundles

1. Open the bundle page (auto-RTL in Arabic).
2. Tap **+** on product cards — or drag cards into the bundle rail (desktop).
3. Watch the progress bar, tier markers and live totals update; nudges show
   "Add N more to save X%".
4. Hit min quantity → CTA enables → **Add bundle to cart** adds all lines in
   one Ajax call, pre-applies the tier's discount code, and opens the cart
   (drawer refresh via the theme's `cart:refresh` event).

## How discounts are calculated

- **UI (live)**: `assets/bundle-pro.js` totals the selection and applies the
  bundle's discount engine — `tiered` / `quantity_break` (highest tier ≤ qty),
  `percentage`, `fixed_amount`, or `bxgy` (cheapest unit per group). All math
  in 3-decimal KWD minor units (fils).
- **Checkout (enforced)**: the active tier's discount code is primed via
  `/discount/CODE`; Shopify validates its minimum-quantity + collection scope
  server-side. The theme never invents prices — if the code requirements
  aren't met, Shopify simply doesn't apply it.

## How metafields work

Product metafields (namespace `bundle`) refine behavior per product:

| Key | Type | Effect |
|---|---|---|
| `enable_bundle_builder` | boolean | Opt-in flag for bundle features |
| `bundle_eligibility` | choice: all / bundle_only / excluded | Where the product may appear |
| `bundle_priority` | integer | Sort order inside bundle grids (low = first) |
| `bundle_category` | text | Grouping label for custom flows |
| `badge` | text | Badge on the product's bundle card |
| `exclude_from_bundle` | boolean | Hide from every bundle |
| `bundle_image_override` | file | Alternate image inside the builder |
| `bundle_price_override` | money | Display-only price inside bundles |

Set them on any product under **Admin → Products → (product) → Metafields**.

## How metaobjects work

A metaobject is a custom content record. The `bundle_v4` definition is the
bundle "database table"; each entry is one bundle. The section receives the
entry either from its *Bundle configuration* picker setting or by auto-selecting
the highest-priority active entry, then renders entirely from its fields.
Sample entries: `premium-spice-gift-box-bundle`, `build-your-own-nuts-box`,
`ramadan-gift-hamper-wizard`.

## Testing checklist

1. Preview theme **Copy of v4** (Online Store → Themes → Copy of v4 → Preview).
2. Create a page with template `bundle-pro`, open it in EN and AR (`/ar/...`).
3. Add 3 nuts products → expect "Save 10%" + total drop; add to cart → cart
   shows NUTSBOX10 applied; checkout total matches the rail.
4. Verify بابونج (chamomile) does **not** appear (excluded via metafield).
5. Mobile: rail should dock to the bottom; safe-area padding respected.
6. Publish Copy of v4 when satisfied.

## Training deck

`docs/bundle-builder-pro-training.pptx` (13 slides) — architecture, metaobject
and metafield structure, bundle types, settings, admin workflow, customer
journey, customization, troubleshooting. Regenerate with
`python3 docs/generate-presentation.py`.
