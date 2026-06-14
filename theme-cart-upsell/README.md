# Cart Upsell — “You May Also Need”

A theme-native cart-drawer upsell section for Shopify Online Store 2.0. No app,
no external server: products come from the theme/metafields/Shopify
Recommendations API, presentation comes from theme-customizer settings, and
add-to-cart uses the storefront AJAX cart (`/cart/add.js`) with native Section
Rendering to refresh the drawer.

Built to feel native in **Theme Copy V5** — Arabic (RTL) + English (LTR),
3-decimal currencies (KWD/BHD/OMR) supported automatically.

## What's in this folder (version-controlled source)

| File | Drop into theme |
|---|---|
| `sections/cart-upsell.liquid` | `sections/` |
| `snippets/cart-upsell.liquid` | `snippets/` |
| `snippets/cart-upsell-card.liquid` | `snippets/` |
| `snippets/cart-upsell-icon.liquid` | `snippets/` |
| `assets/cart-upsell.css` | `assets/` |
| `assets/cart-upsell.js` | `assets/` |
| `locales/en.default.json` | merge into theme `locales/en.default.json` |
| `locales/ar.default.json` | merge into theme `locales/ar.default.json` |

Merge the locale files — don't overwrite. Add the `cart_upsell` object to your
theme's existing `en.default.json` / `ar.default.json`.

## Install

1. Copy the files above into the matching theme folders.
2. Merge the two `cart_upsell` locale blocks into the theme's locale files.
3. Add the upsell to the cart drawer (pick **A** or **B**):

   **A · Section group (recommended, OS 2.0 Dawn-style).** If your cart drawer
   lives in a section group, add the **Cart Upsell** section there via the Theme
   Editor and arrange it. The Recommendations API auto-render works because the
   section is addressable.

   **B · Render the snippet inline.** Open the theme's cart-drawer file
   (commonly `snippets/cart-drawer.liquid` or `sections/cart-drawer.liquid`) and
   add the snippet where you want it — e.g. above the checkout button:

   ```liquid
   {% render 'cart-upsell', st: settings, section_id: 'cart-upsell-drawer' %}
   ```

   Inline rendering uses theme defaults; for full Theme Editor control over an
   inline placement, also add the **Cart Upsell** section once (its settings are
   read through `section.settings`).

4. In the Theme Editor open **Cart Upsell** and configure content, source,
   layout, styling, behavior, and product-data toggles.

## Placement

The `Position` setting re-anchors the block inside the live drawer via JS:
**above cart items**, **below cart items**, **above checkout button**, or
**below checkout button**. If your drawer uses non-standard markup, place the
snippet directly at the spot you want and leave Position alone.

## Product sources

| Source | How it resolves |
|---|---|
| Manual product selection | The products you pick in the editor (`product_list`). |
| Collection based | Products from the chosen collection. |
| Automatic recommendations | Shopify Product Recommendations API, seeded from the most recent cart item (rendered client-side via Section Rendering). |
| Related products | `Collection` match renders server-side from the seed product's first collection; `Product type` / `Vendor` / `Tags` use the Recommendations API (`intent=related`). |
| Metafield driven | A product-list metafield (default `custom.cart_upsell`) read from the items already in the cart. |

Products already in the cart are always excluded.

### Metafield setup

Create a **product** metafield `custom.cart_upsell` of type
*Product list*, link the add-ons on each product, then choose **Metafield
driven** as the source.

## Layouts

Horizontal carousel · Vertical list · Grid (2-col, configurable) · Compact mini
cards · Premium product cards. Cards-per-row is configurable for desktop and
mobile independently.

## RTL / LTR

Direction is detected from `request.locale.iso_code` (`ar` → RTL) with an
optional **Force RTL** override. The stylesheet uses CSS logical properties
throughout, so a single sheet mirrors cleanly — carousel paging, arrows, and
snapping are all inline-direction aware. Arabic title/subtitle fields override
the English ones when the storefront locale is Arabic.

## Translations

All copy goes through Shopify `t` / the JS i18n payload — no hardcoded strings.
English and Arabic ship complete (Add to Cart, Sold Out, Select Option,
Quantity, Recommended For You, View Product, Added, Loading, Out of Stock, …).

## Add-to-cart behavior

Quick add with no page refresh: `/cart/add.js` with the `sections` parameter so
Shopify returns re-rendered cart-drawer HTML, which the element swaps in.
Loading spinner → success checkmark → error state with inventory messages. For
themes that own their drawer, `cart:refresh` / `cart:updated` / `cart:build`
events (and `Shopify.onCartUpdate`) fire on a debounced `/cart.js` read as a
fallback. Variant pickers (dropdown / buttons / color swatches) and an optional
quantity stepper work fully inside the drawer.

## Performance & accessibility

- Lazy-loaded, responsive `srcset` images; `aspect-ratio` reserves space (no CLS).
- Native scroll-snap carousel (touch swipe + momentum), no carousel library.
- Debounced cart updates; JS deferred; assets loaded once.
- Keyboard navigation, visible focus states, ARIA labels, `role="status"` live
  region, `prefers-reduced-motion` respected.

## Notes

- Cart prices always come from the variant at add-time; displayed prices are for
  presentation only.
- The element re-initialises automatically when the drawer re-renders.
