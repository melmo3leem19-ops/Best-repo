# Phase 4 — Featured Products: Premium Multi-Layout Engine

Theme: "Copy of Copy of v4" (`gid://shopify/OnlineStoreTheme/187213774882`, UNPUBLISHED).
Files: `sections/featured-products.liquid` (v8 → v9), new `assets/featured-products-modes.css`.
Mirror copies live under `almoallem-theme/`; both byte-match the theme (see Verification).

## What existed (v8)

A ~37 KB self-contained custom section:

- Two layout modes per viewport: `grid` (CSS grid, `columns_desktop`/`columns_mobile`)
  and `carousel` (flex + scroll-snap-style scrolling, `visible_desktop`/`visible_mobile`),
  selected independently via `layout_desktop` / `layout_mobile`.
- One shared card markup loop: image link (ratio box via `padding-bottom`), title,
  price with multi-variant placeholder, variant `<select>`, AJAX quick-add button.
- AJAX add-to-cart via `/cart/add.js` with `sections=[...]` injection, `cart:update`
  dispatch, drawer auto-open. RTL-aware carousel JS (negative `scrollLeft` handling)
  and `[dir="rtl"]` arrow-icon mirroring.
- 52 schema settings (colors, sizes, paddings, texts), all per-section, plain
  English labels (existing convention; kept).

## What was added (v9)

### 1. Four new layout modes (6 total per viewport select)

Both `layout_desktop` and `layout_mobile` now offer: `grid`, `carousel` (unchanged),
plus:

| Mode | Desktop (≥750px) | Mobile (≤749px) |
|---|---|---|
| `bento` | 4-col dense grid; first product spans 2×2 as a filled hero tile; every 7th product spans 2 columns | 2-col grid; first product full-width hero |
| `editorial` | 12-col grid, repeating 4-item rhythm of oversized (span 7/6) and small (span 4) tiles with staggered `margin-block-start` whitespace offsets | Single column, items at 86% width alternating start/end (`margin-inline-start: auto`) |
| `luxury` | 2-col grid capped at 960px and centered, 3× gap, centered info, large serif titles (`--font-heading--family` fallback Georgia), built-in subtle fade-up reveal | Single column capped at 480px, 2.5× gap, same treatment |
| `storytelling` | Each card becomes a full-width 1fr/1fr row: image one side, content vertically centered on the other; even rows flip via grid `order` (writing-direction aware → RTL-safe) | Stacked full-width rows with enlarged title and padded info |

Implementation: static modifier classes (`.ai-fp--d-<mode>`, `.ai-fp--m-<mode>`) +
generic structural classes (`.ai-fp__list/__item/__media/__info/__title/__price`)
added alongside the existing per-instance suffixed classes. All mode CSS lives in
the new `assets/featured-products-modes.css` (the inline `{% style %}` was already
~270 lines). Card markup is 100% shared across all 6 modes; grid/carousel inline
CSS output is unchanged. The inline `{% else %}` grid branches became
`{% elsif ... == 'grid' %}` so new modes emit no inline layout CSS (the asset owns
them); arrows auto-hide for any non-carousel mode (existing `!= 'carousel'` guards
already covered this); carousel JS stays inert via the existing `--is-carousel` probe.

### 2. Badge integration (Phase 2)

`{% render 'badge-system', product: product, context: 'card' %}` rendered inside the
card's image container (`.ai-fp__img-wrap-*`, which is `position: relative` — the
badge's absolute positioning anchor). Guarded: output is `{% capture %}`d and dropped
if it contains `Liquid error`, so a missing snippet fails silently. Also gated by the
global `settings.badge_system_enabled` (inside the snippet) and a new per-section
`show_badges` checkbox. `badge-system.css` already loads globally from `theme.liquid`.
This is the one intentional visible addition for existing instances (badges appear on
qualifying products, matching the rest of the store, e.g. `snippets/card-gallery.liquid`).

### 3. New merchant controls (12 settings, 4 headers)

| Setting id | Type | Default | Default behavior |
|---|---|---|---|
| `heading_align` | select default/start/center/end | `default` | emits no CSS |
| `gap_split` | checkbox | `false` | single `gap` used everywhere, CSS identical to v8 |
| `gap_desktop` | range 5–50 | 20 | inert until `gap_split` |
| `gap_mobile` | range 5–50 | 20 | inert until `gap_split` |
| `animation_preset` | select none/fade-up/stagger | `none` | no reveal attrs, no observer |
| `hover_effect` | select default/lift/glass | `default` | class `ai-fp--hover-default` matches no CSS; v8 zoom/lift untouched |
| `shadow_intensity` | range 0–100 | 0 | emits no CSS |
| `title_weight` | select default/400–700 | `default` | emits no CSS |
| `title_tracking` | range −2–4 (0.5 step) | 0 | emits no CSS |
| `price_weight` | select default/400–700 | `default` | emits no CSS (v8 hardcoded 600 kept) |
| `price_tracking` | range −2–4 (0.5 step) | 0 | emits no CSS |
| `show_badges` | checkbox | `true` | badges render (intentional Phase 4 feature; uncheck to disable per section) |

Effects detail:

- **Lift**: `translateY(-6px)` + stronger shadow at higher specificity than the v8
  built-in `-4px` hover; mirrored on `:focus-within` for keyboard users.
- **Glass overlay**: card stays static; a decorative glass sheet (brief §2 recipe —
  `blur(16px) saturate(1.4)`, light-edge border, `@supports` opaque fallback) glides
  over the lower 34% of the image on hover/focus-within. No text on glass, so the
  4.5:1-over-busy-backdrop rule is not in play.
- **Reveals**: IntersectionObserver, fires once, hidden state only after `.ai-fp-js`
  is added by JS (JS failure never hides products), stagger 70ms capped at 6 items,
  observer disconnected in `disconnectedCallback` and on reduced-motion change.

### 4. Quality passes

- **Logical properties**: all new CSS uses `inline-size`, `margin-inline-*`,
  `padding-block-*`, `inset-inline`, `inset-block-end`, `min-block-size`, etc.
  Editorial uses grid line numbers and storytelling uses grid `order` — both are
  writing-direction aware, so layouts mirror automatically under `dir="rtl"`.
- **prefers-reduced-motion**: full kill-switch at the end of the asset
  (`transform: none !important`, opacity-only ≤200ms, animations off, reveal items
  forced visible, glass overlay suppressed, carousel `scroll-behavior: auto`), with
  an explicit exception keeping RTL arrow glyphs mirrored. JS additionally
  short-circuits the observer and listens for mid-session changes.
- **Keyboard**: no new interactive elements; hover-only effects mirrored on
  `:focus-within`; arrow SVGs now `aria-hidden="true" focusable="false"`.
- **Lazy loading**: product images already shipped `loading="lazy"` — unchanged.

## Pre-existing RTL/i18n issues found

| Issue | Status |
|---|---|
| Arrow buttons had hardcoded English `aria-label="Previous"/"Next"` (announced in English to Arabic screen-reader users) | **Fixed** — now `{{ 'accessibility.slideshow_previous' | t }}` / `slideshow_next` (keys exist in both `en.default.json` and `ar.json`; no locale edits needed) |
| Reduced-motion transform kill would have un-mirrored RTL arrow icons | **Fixed preemptively** in the new CSS exception |
| `img`/placeholder use `top:0; left:0` with `width/height:100%` | Not a bug — element fills its box in both directions; left untouched to preserve byte-stable v8 CSS |
| Hardcoded Arabic price placeholder "السعر عند الأخيار" in markup AND in JS shows Arabic on English pages | **Flagged, not fixed** — it's a localization (not RTL) issue; the proper fix needs a new translation key, and locale files are owned by another agent this phase |
| Header/heading rely on flex + inherited `text-align` | OK in RTL (logical by nature) |

## Backward-compatibility verification

The two live `templates/index.json` instances (`featured_products_nFCcAJ`,
`featured_products_RgUnXp`) both use `layout_desktop/mobile: carousel` with every
v8 setting explicitly set. Walkthrough:

- No existing setting id renamed/removed; schema retains all 52 v8 settings plus
  the additions (65 ids + headers). Presets and section name unchanged.
- Carousel inline CSS: `gap_split` is false/absent → `gap_desktop_val == gap_mobile_val
  == gap` → emitted `gap` and flex-basis `calc(...)` are numerically identical to v8.
- All new conditional CSS blocks emit nothing at defaults; new root classes
  (`ai-fp--d-carousel`, `ai-fp--hover-default`, …) match no rules in the asset.
  The only universal asset rule, `.ai-fp .ai-fp__item { min-inline-size: 0 }`, is a
  no-op here (items are `flex-shrink: 0` and `overflow: hidden`).
- No reveal attributes/observer at `animation_preset: none`; quick-add/ATC JS path
  untouched.
- Visible deltas for existing instances: (a) badges on qualifying products
  (intentional), (b) localized arrow aria-labels (a11y fix), (c) animations disabled
  under reduced-motion (a11y conformance). `templates/index.json`, locales, and
  `config/settings_schema.json` were not modified.

## Verification results

- Schema block extracted and `JSON.parse`d — valid; name "Featured products"
  (17 ≤ 25 chars); presets intact.
- Every `section.settings.*` reference exists in schema; liquid tag pairs balanced
  (if/endif, capture, style, schema, comment, case); style-block and asset braces
  balanced; section `<script>` parses as JS.
- No physical `left/right/margin-left/...` properties in the new CSS.
- Upserted via `themeFilesUpsert`, re-downloaded, checksums byte-match the mirror:
  - `sections/featured-products.liquid` → md5 `be7e68406cecabfd1f643bca771ed835` (remote == mirror)
  - `assets/featured-products-modes.css` → md5 `72dbc743898bc8b5d41815b20b724ba2` (remote == mirror)
- Note: the v8 file was stored with CRLF line endings; v9 is normalized to LF
  (content otherwise line-for-line preserved outside the documented edits).

## Open items

- Localize the "price on selection" placeholder ("السعر عند الأخيار") once locale
  files are unfrozen (needs a new key in `en.default.json`/`ar.json`, then replace
  the three hardcoded occurrences in the section).
- Optional polish: theme-editor preview presets for the four new modes; consider
  `content-visibility: auto` on the section root (used in Phase 3) if homepage
  length grows.
