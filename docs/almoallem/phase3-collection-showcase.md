# Phase 3 — Universal Collection Showcase

Store: Al Moallem Mill (bilingual ar RTL / en LTR, KWD). Theme: "Copy of Copy of v4" — `gid://shopify/OnlineStoreTheme/187213774882` (unpublished).

## Files

New:

- `sections/universal-collection-showcase.liquid` — section, settings schema, item loop, viewport split
- `snippets/showcase-collection-card.liquid` — single mode-agnostic card markup
- `snippets/showcase-layout.liquid` — per-mode structural wrappers (one `case`)
- `assets/collection-showcase.css` — all mode/hover/reveal CSS (`.ucs__*` BEM-ish)
- `assets/collection-showcase.js` — minimal companion script (reveal, progress, reduced-motion autoplay stop)

Edited:

- `locales/en.default.json` / `locales/ar.json` — added runtime keys only; `/* */` headers preserved byte-for-byte
- `templates/index.json` — section instance wired in (see below)

## Reused vs. new (carousel engine decision)

**Reused — the theme's slideshow engine.** Carousel mode is built entirely on the existing, RTL-aware, battle-tested stack: `assets/slideshow.js` (`<slideshow-component>` custom element), `snippets/slideshow.liquid`, `snippets/slideshow-slide.liquid`, `snippets/slideshow-arrows.liquid`, `snippets/slideshow-controls.liquid`, plus the `resource-list__carousel` sizing pattern (`--column-count`, `--mobile-card-size`, `force-full-width`, gutter vars) copied from `snippets/resource-list-carousel.liquid`. No new carousel engine was written.

Engine facts verified by reading `slideshow.js`:

- `autoplay="<seconds>"` attribute (multiplied ×1000 internally), `infinite` attribute, `initial-slide`, `paused` attribute, `play()`/`pause()` methods
- aria-hidden bookkeeping per slide handled by the engine (`#updateVisibleSlides`)
- scroll/drag based (Scroller + scrollIntoView) → native RTL scroll behavior, no manual mirroring needed
- `prefersReducedMotion()` is used for instant (non-animated) slide jumps; autoplay stop under reduced motion is NOT handled by the engine — our JS adds it
- Viewport-gated compositor layers (`in-viewport` attribute) — iOS Safari safety, free for us

**Reused — layout snippets:** `snippets/bento-grid.liquid` (bento mode) and `snippets/editorial-collection-grid.liquid` (editorial mode), with small CSS shims so `.ucs-card` fills their tiles. `slideshow-controls` pause/play buttons reuse existing `accessibility.slideshow_pause/play` and `accessibility.slide_status` locale keys (already present in both en and ar).

**New:** card markup (`showcase-collection-card`), the other 6 mode layouts (pure CSS), reveal/progress JS. `snippets/collection-card.liquid` was studied but not rendered directly — it is hard-coupled to the Horizon `_collection-card` theme-block tree (`content_for 'block'`, nested image/title blocks); a standalone card snippet is far simpler and keeps one markup loop for all 9 modes. Its conventions (visually-hidden link text, `[dir=rtl]` transform flips, reduced-motion blocks) were carried over.

Product badges (Phase 2) are product-level; collection cards intentionally show no badges.

## The 9 modes — visual spec

| Mode | One-liner | Visual spec |
|---|---|---|
| carousel | Slideshow-engine track with arrows/dots/counter/progress | N columns desktop (`--column-count`), 1 peeking card mobile (width = `mobile_card_width` cqw), chevron-in-circle arrows, optional autoplay w/ pause button, infinite loop toggle |
| grid | Plain CSS grid | `repeat(var(--ucs-cols))` desktop / `--ucs-cols-mobile` mobile, uniform aspect cards |
| bento | Varied tile spans | Reuses theme bento-grid 12-col area templates (A–L), cards stretch to tile height, 2-col stacking <900px |
| masonry | CSS multi-column flow, no JS lib | `columns: var(--ucs-cols)`, `break-inside: avoid`, aspect ratios cycle 3:4 / 1:1 / 4:5 / 5:6 for organic rhythm |
| editorial | Large imagery, asymmetric whitespace | Reuses theme editorial-collection-grid: 12-col grid with offset row/col spans, flex column stack on mobile |
| magazine | Mixed sizes, rule lines, numbering | 12-col grid: 7/5 split row, three 4-col cards, one full-bleed 21:9 row per 6 items; hairline `border-block-start` rules + `01`-style CSS counters |
| split | Sticky text panel + scrolling cards | Desktop 50/50 grid, start panel `position: sticky` with section heading + description, cards stack in end column; plain stack mobile (top heading hidden when split is the visible viewport) |
| storytelling | Full-width alternating image/text rows | Each card becomes a 3fr/2fr grid row; even rows swap media/content via grid `order` (writing-direction aware → RTL-safe) |
| luxury | Oversized imagery, serif large type, restraint | Single column, max 1080px, 16:10 media, `var(--font-heading--family)` titles up to 2.5rem, 3–4× gap spacing, subtle opacity/translate reveal only |

All 9 modes are selectable independently for desktop (`layout_desktop`) and mobile (`layout_mobile`). When they match, ONE responsive viewport renders; when they differ, two wrappers render gated by the theme's `hidden--mobile` / `hidden--desktop` utilities.

## Settings inventory (30 settings + 1 block type)

General: `heading`, `heading_alignment` (start/center/end), `description` (richtext), `collection_list` (fallback, limit 12), `color_scheme` (theme `color_scheme` type, default scheme-1), `section_width` (page/full).

Cards: `show_product_count`, `text_position` (overlay_bottom / overlay_center / below), `show_scrim`, `scrim_strength` (0–90%, drives `--ucs-scrim-alpha`), `card_radius` (0–40px).

Desktop: `layout_desktop` (9 modes), `columns_desktop` (2–6), `gap` (0–60px), `card_aspect` (adapt/1:1/4:3/3:4/4:5/16:9), `hover_effect` (none/zoom/lift/reveal-text/glass), `enable_reveal`.

Mobile (independent): `layout_mobile` (9 modes), `columns_mobile` (1/2), `mobile_card_width` (40–90% carousel peek), `card_aspect_mobile` (same 6 options), `enable_swipe_mobile`, `enable_animation_mobile` (reveal off by default on mobile).

Carousel: `navigation_style` (arrows / dots / arrows_dots / counter / progress), `autoplay`, `autoplay_speed` (3–9s), `infinite_loop`.

Performance: `enable_virtual_rendering` (content-visibility).

Padding: `padding-block-start`, `padding-block-end` (consumed by the theme's `spacing-style` snippet, as in stock sections).

Block `collection` (max 12, merchants control order): `collection` picker, `custom_image`, `custom_title`, `custom_text`. Fallback chain: blocks → `collection_list` setting → 4 onboarding placeholder cards. 2–12 collections supported.

Schema labels are plain strings (consistent with existing custom sections); name "Collection Showcase" (19 chars); full `presets` entry (4 collection blocks) so it appears in the editor section picker.

## Runtime translations added (both locales, headers untouched)

- `accessibility.collection_showcase` — region label fallback ("Collection showcase" / "واجهة عرض المجموعات")
- `actions.view_collection` — card CTA ("View collection" / "عرض المجموعة")
- `content.ucs_product_count` — pluralized count; Arabic includes full zero/one/two/few/many/other forms

Reused existing keys: `accessibility.slideshow_pause/play`, `accessibility.slide_status`, `placeholders.collection_title`.

## RTL mechanisms

- CSS uses logical properties exclusively (`margin-inline`, `inset-block-start`, `padding-block`, `inline-size`, `border-block-start`); zero physical left/right
- Slideshow engine is scroll-based → swipe direction, snapping, and keyboard arrows mirror natively under `dir="rtl"`; arrow icon mirroring handled by the theme's existing `slideshow-arrow` styles
- CTA arrow glyph mirrored via `[dir='rtl'] … { transform: scaleX(-1) }` (explicitly re-asserted inside the reduced-motion kill-switch so the glyph stays correct)
- Progress bar `transform-origin` flips under `[dir='rtl']`
- Storytelling alternation and editorial/magazine grid placement use CSS grid columns/order, which follow writing direction automatically

## Accessibility

- Section root: `role="region"` + `aria-label` (heading, else translated fallback)
- One `<a>` per card; no nested interactive elements; `:focus-visible` outline on the link; `<h3>` card titles
- Carousel: engine-managed `aria-hidden` per offscreen slide (verified in `slideshow.js`); prev/next are real `<button>`s with translated aria-labels via existing snippets; dots carry `slide_status` labels; pause/play `<button>` is force-rendered whenever autoplay is on, even if the merchant picked an arrows/progress-only nav style
- Mobile carousel arrows ≥44×44px touch targets
- Gradient scrim setting for text-over-image contrast; reveal-text hover effect also triggers on `:focus-within`
- Reduced motion: global `transform: none !important` kill-switch, opacity-only ≤200ms transitions, autoplay paused by JS (engine doesn't do this itself), progress bar hidden

## Performance

- `loading="lazy"` on all card images except the first two (eager); responsive `srcset` (300–1500w) with column-aware `sizes`
- "Virtual rendering": `content-visibility: auto` + `contain-intrinsic-size: auto 640px` on the section when `enable_virtual_rendering` is on — documented to the merchant as "Skip offscreen rendering"
- 8 of 9 modes are zero-JS; carousel reuses the already-loaded engine; companion JS is ~5KB, deferred, IntersectionObserver-based, fires reveals once, caps stagger at 6 items, skips animation on `hardwareConcurrency <= 4`
- Reveal hidden-state only applies after JS adds `.ucs-js`, so JS failure never hides content; transform/opacity-only animations throughout
- Single-viewport render when desktop and mobile layouts match (no duplicate DOM)
- Re-inits on `shopify:section:load`, disconnects observers on `shopify:section:unload`

## index.json placement

`universal_collection_showcase` inserted at `order[1]`, directly after the lead `_blocks` hero section (`blocks_EaCpaD`) and before `dynamic_shipping_bar_XyN3WH`. Three real, non-empty collections wired as blocks (by handle): `بهارات` (33 products), `مكسرات` (30), `دراجية` (57). Defaults: carousel desktop + mobile, 4 columns, arrows + dots, no autoplay, Arabic heading "تسوق حسب المجموعة". No other templates touched.

## Open items

- `slideshow-controls` dots/counter colors inherit the theme's control styling; if a merchant pairs a dark color scheme with overlay carousels, contrast should be eyeballed in the editor
- "Progress" nav style depends on relative color syntax for its track tint on very old browsers; a flat gray fallback is declared first
- Magazine/masonry item-count sweet spots: magazine pattern repeats per 6 items, masonry looks best with ≥6; with only 2–3 collections grid/split/luxury read better (merchant guidance, not a defect)
- Section settings text (heading/description and block custom titles) is store-content, translated via Shopify Translate & Adapt, not theme locales — expected Shopify behavior
- Theme editor preview of `content-visibility: auto` can defer paint of far-offscreen sections while scrolling fast; toggle `enable_virtual_rendering` off if a merchant reports it

## Sync verification (final)

All Phase 3 files confirmed on theme `Copy of Copy of v4` (187213774882) with MD5
byte-match against this mirror on 2026-06-11:

| File | MD5 |
|------|-----|
| sections/universal-collection-showcase.liquid | 0902a53c88a3a2627af6ae49bd0bf574 |
| snippets/showcase-collection-card.liquid | 1f07dfaf7018e8266eeb25e51f0ba565 |
| snippets/showcase-layout.liquid | 879ebd30228a7131eb7391d1ef65b3bb |
| assets/collection-showcase.css | e24e0478a449bcc748a6a7d1c162d825 |
| assets/collection-showcase.js | 6418dba5814adf15ca64257b4d04f6ba |
| locales/en.default.json | 8493abe1d775886c4994df1272fe23bc |
| locales/ar.json | 61bb3494dcc15ee8b381498f86ecbcc3 |
| templates/index.json | ee0e9c9fbb4f4e67498d50291b1e1c35 |

Homepage (`templates/index.json`) now renders the showcase as the second section
with collections: بهارات، مكسرات، دراجية (carousel mode, arrows+dots, infinite loop,
reveal animation desktop-only, virtual rendering on).
