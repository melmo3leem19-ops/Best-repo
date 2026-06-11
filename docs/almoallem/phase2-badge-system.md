# Phase 2 — Advanced Badge System

Theme: **Copy of Copy of v4** (`gid://shopify/OnlineStoreTheme/187213774882`, unpublished)
Mirror: `/home/user/Best-repo/almoallem-theme/` (source of truth)
Status: **Synced and verified 2026-06-11** — all 10 files on the theme byte-match the mirror (MD5 verified).

---

## 1. Architecture & render flow

Single entry point: `snippets/badge-system.liquid`. All call sites are guarded by
`settings.badge_system_enabled`; when the system is disabled, call sites fall back to the
legacy `custom-badge` path (which itself now delegates to badge-system, see 1.4).

| # | Call site | Context | Covers |
|---|-----------|---------|--------|
| 1 | `snippets/card-gallery.liquid` (line ~216) | `card` | Every product card: collection grids, search results, featured collections, product recommendations, recently viewed — anything rendered through the Horizon card pipeline |
| 2 | `snippets/product-media-gallery-content.liquid` (line ~645) | `product-page` | Main product page media gallery (`<media-gallery>` is `position: relative` via its stylesheet block) |
| 3 | Quick view (indirect) | — | `snippets/quick-add-modal.liquid` is an empty shell (`#quick-add-modal-content`) populated client-side by fetching the product page; the fetched markup includes `product-media-gallery-content.liquid`, so badges render automatically. `assets/badge-system.css` adds a `.quick-add-modal__content .badge-system` scope to keep badges compact in the dialog. No edit to `quick-add-modal.liquid` was required. |
| 4 | `snippets/custom-badge.liquid` | legacy shim | One-liner that renders `badge-system` with `context: 'card'` and forwards `position` as `position_override`. Kept so any remaining legacy call sites keep working. |

CSS is loaded once in `layout/theme.liquid` (head):

```liquid
{% if settings.badge_system_enabled %}
  {{ 'badge-system.css' | asset_url | stylesheet_tag }}
{% endif %}
```

`blocks/_product-card-gallery.liquid` carries a comment noting the native sale/sold-out badge
is superseded by the Badge System when enabled.

## 2. Badge content priority

Resolved in `badge-system.liquid`, first match wins:

1. `custom.custom_badge` metaobject → field `add_the_badge` (free text) → type `custom`
2. `custom.best_seller` boolean → localized `content.product_badge_best_seller`
3. `custom.best_value` boolean → localized `content.product_badge_best_value`
4. Available and `compare_at_price > price` → localized `content.product_badge_sale`
5. `product.available == false` → localized `content.product_badge_sold_out`

Renders nothing when no rule applies or `badge_system_enabled` is false. Badge text is
`| escape`d. Locale keys exist in `locales/en.default.json` (lines 229–232) and
`locales/ar.json` (lines 215–218).

## 3. Layout resolution (custom.badge_layout)

`product.metafields.custom.badge_layout` is downcased/stripped and matched tolerantly:
`option N` / `layout_N` / `layout N` / `N` → layout N; anything else falls back to layout 1.

| Layout | Style | Distinct traits |
|--------|-------|-----------------|
| 1 | Minimal luxury pill | Uppercase, pill radius 50, gold gradient default |
| 2 | Glassmorphism chip | `color-mix` translucent bg + `backdrop-filter: blur(16px)`; opaque `@supports` fallback so text never becomes unreadable |
| 3 | Ribbon / corner banner | `clip-path` trailing-edge notch, RTL-mirrored notch, deep red default |
| 4 | Outlined + icon | Border-forward, optional star SVG icon (`bs_l4_icon`, aria-hidden) |
| 5 | Premium glow card | Gradient border via dual `padding-box`/`border-box` backgrounds, always-on glow layer (opacity .55, .85 on card hover) |

## 4. Settings inventory — "Badge System" group (config/settings_schema.json, group 19)

General:

| id | type | default |
|----|------|---------|
| `badge_system_enabled` | checkbox | true |
| `bs_position` | select: top-left / top-right / bottom-left / bottom-right / center / custom | top-left |
| `bs_position_mobile` | select: same + the 6 above | same |
| `bs_custom_x`, `bs_custom_y` | range 0–100 % | 4 / 4 |
| `bs_show_desktop`, `bs_show_mobile` | checkbox | true / true |
| `bs_animation` | select: none / shine / glow / pulse / float / bounce / wave / scale-in / luxury | none |
| `bs_anim_mobile` | checkbox | false |

Per layout (N = 1..5), 13 settings each + `bs_l4_icon`:
`bs_lN_text`, `bs_lN_bg_style` (solid/gradient), `bs_lN_bg`, `bs_lN_grad1`, `bs_lN_grad2`,
`bs_lN_border_color`, `bs_lN_border_width` (0–4px), `bs_lN_radius` (0–50px), `bs_lN_shadow`
(0–100%), `bs_lN_glow`, `bs_lN_size_m` (8–16px), `bs_lN_size_d` (9–22px), `bs_lN_tracking`
(0–4px, step .5).

Defaults per layout: L1 gold gradient/white text, L2 white glass/dark text, L3 deep red
ribbon, L4 white outlined w/ gold border + icon, L5 near-black with gold gradient border &
gold glow.

Consistency audit result: every `settings.bs_*` / `badge_system_enabled` reference in
`badge-system.liquid` exists in the schema group, and every emitted CSS custom property
(`--bs-text/bg/grad1/grad2/border-color/border-w/radius/shadow-a/glow/size-m/size-d/tracking/x/y`)
is consumed by `assets/badge-system.css` (and vice versa; `--bs-inset` and the motion tokens
are CSS-internal). No fixes were needed.

## 5. Animation presets

All transform/opacity-only; tokenized durations/easings on `.badge-system`.

| Preset | Mechanism |
|--------|-----------|
| shine | Shine layer translateX sweep, 2.6s; `bs-shine-rtl` keyframes under `[dir='rtl']` |
| glow | Glow layer opacity 0.3↔0.8, 1.8s alternate |
| pulse | Inner scale 1↔1.04, 1.6s |
| float | Inner translateY 0↔-3px, 3s |
| bounce | Inner translateY double-bounce, 1.6s bounce easing |
| wave | Inner rotate -2°↔2°, 1.4s alternate |
| scale-in | One-shot entrance scale .8→1 + fade |
| luxury | shine (3.8s) + glow (2.8s) combined |
| none | No `--anim-*` class emitted |

Mobile: all animations disabled below 750px unless `bs_anim_mobile` adds
`.badge-system--anim-mobile`.

Reduced motion (`prefers-reduced-motion: reduce`): all animations/transitions killed with
`!important`, shine layer hidden, and `scale-in` degrades to a 200ms opacity-only `bs-fade-in`.

## 6. Positioning matrix & RTL

- Positions use **logical properties** (`inset-block-start/end`, `inset-inline-start/end`),
  so left/right mirror automatically in RTL.
- `center` uses 50%/50% + `translate: -50% -50%` with an explicit `[dir='rtl']` flip.
- `custom` reads `--bs-x`/`--bs-y` (emitted only when desktop or mobile position is custom).
- Mobile override classes `.badge-system--m-*` (emitted only when `bs_position_mobile != same`)
  reset `inset`/`translate` then re-apply below 750px.
- Inset token: 8px mobile, 12px desktop, 16px product page, 12px in quick-view modal.
- RTL specifics: layout 3 notch clip-path mirrored; shine sweep direction reversed.

## 7. Accessibility

- Decorative layers (`__glow`, `__shine`, layout-4 icon SVG) are `aria-hidden="true"`
  (`focusable="false"` on the SVG).
- Badge is a `<span>` with `pointer-events: none` — never a focus/tab stop.
- Badge text is real text (screen-reader readable), escaped, ellipsized on overflow with
  `max-inline-size` caps so it never escapes the card.
- Layout 2 ships an opaque fallback when `backdrop-filter` is unsupported.
- Full `prefers-reduced-motion` override (see section 5).

## 8. Sync record (theme ⇄ mirror)

Pre-sync state of the theme vs. what was uploaded:

| File | Pre-sync state on theme | Action |
|------|------------------------|--------|
| `snippets/badge-system.liquid` | **missing** | created (7,897 B) |
| `assets/badge-system.css` | **missing** | created (11,812 B) |
| `snippets/custom-badge.liquid` | old standalone legacy version (5,850 B) | replaced with shim (623 B) |
| `snippets/card-gallery.liquid` | no badge-system call | replaced (adds guarded render block) |
| `snippets/product-media-gallery-content.liquid` | no badge-system call | replaced (adds guarded render block + media-gallery positioning CSS) |
| `layout/theme.liquid` | no badge-system.css tag | replaced (adds conditional stylesheet tag) |
| `config/settings_schema.json` | 60,019 B — no Badge System group | replaced (76,263 B, adds group 19) |
| `locales/en.default.json` | missing 4 `product_badge_*` keys | replaced |
| `locales/ar.json` | missing 4 keys + other Phase translations | replaced |
| `snippets/quick-add-modal.liquid` | already identical to mirror | no action |

Verification: post-upsert `checksumMd5` for all 10 files equals local `md5sum` of the mirror.
One mirror-side adjustment: decorative box-drawing divider comments in
`assets/badge-system.css` were normalized to the uploaded version (comment-only,
zero CSS-rule change) so theme and mirror byte-match (`b769dc173640eab48c3ad952e1e9117f`).
Server did not otherwise normalize any JSON/liquid.

## 9. Metafield work

- `custom.badge_layout` (`gid://shopify/MetafieldDefinition/225113079842`,
  `single_line_text_field`, admin PUBLIC_READ_WRITE, storefront PUBLIC_READ) already had a
  `choices` validation — but only the legacy values `Option 1..Option 5`.
- Performed `metafieldDefinitionUpdate`: choices are now the **union**
  `["layout_1","layout_2","layout_3","layout_4","layout_5","Option 1","Option 2","Option 3","Option 4","Option 5"]`
  — new canonical values selectable, existing product data still valid (the liquid resolver
  accepts both forms).
- Live examples already exist; no product writes performed:
  - `gid://shopify/Product/8430682898466` ("دراجية مشكلة جميع النكهات") → `Option 2` (renders layout 2)
  - `gid://shopify/Product/8453986844706` ("شوكلاتة بيضة كندر") → `Option 1` (renders layout 1)

## 10. Open items

1. Layouts 3–5 have no live product example (only layouts 1–2 via the legacy values above).
   Optional: set `layout_5` on one product in admin to showcase the premium glow style.
2. Once all product values are migrated to `layout_*`, the legacy `Option N` choices can be
   removed from the metafield validation and the legacy branches dropped from the liquid
   `case` (cosmetic cleanup, not urgent).
3. `snippets/custom-badge.liquid` is retained only as a shim; if a later grep confirms no
   remaining `render 'custom-badge'` call sites outside the two guarded fallbacks, it can be
   deleted in a future phase.
4. Theme settings currently ship with `bs_animation: none`; merchant may want `luxury` for
   the brand feel — one dropdown in Theme settings → Badge System.
