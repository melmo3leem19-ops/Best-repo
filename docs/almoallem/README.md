# Almoallem Theme Refactor — Deliverables Index

Store: **Al Moallem Mill** (almoallemmill.com, Kuwait, KWD, AR/EN).
Target theme: **Copy of Copy of v4** — `gid://shopify/OnlineStoreTheme/187213774882` (unpublished).
Every theme change in this folder's reports was uploaded via the Shopify Admin
GraphQL API and verified by MD5 checksum against the mirror in `almoallem-theme/`.

## Architecture overview

```mermaid
graph TD
  subgraph Store data
    MF1[product metafield custom.badge_layout - choice layout_1..5]
    MF2[product metafield custom.custom_badge - badge metaobject ref]
    MF3[custom.best_seller / custom.best_value booleans]
  end

  subgraph Badge System - Phase 2
    BS[snippets/badge-system.liquid] --> BCSS[assets/badge-system.css]
    SS[settings_schema.json - Badge System group] --> BS
    MF1 --> BS
    MF2 --> BS
    MF3 --> BS
    LEGACY[snippets/custom-badge.liquid shim] --> BS
  end

  subgraph Card pipeline
    CG[snippets/card-gallery.liquid] --> BS
    PMG[snippets/product-media-gallery-content.liquid] --> BS
    QV[quick view - fetches product page] --> PMG
    FP[sections/featured-products.liquid] --> BS
  end

  subgraph Collection Showcase - Phase 3
    UCS[sections/universal-collection-showcase.liquid]
    UCS --> SCC[snippets/showcase-collection-card.liquid]
    UCS --> SL[snippets/showcase-layout.liquid]
    UCS --> UCSS[assets/collection-showcase.css]
    UCS --> UJS[assets/collection-showcase.js]
    UCS --> ENGINE[assets/slideshow.js - existing RTL engine]
    UCS --> BENTO[snippets/bento-grid.liquid - existing]
  end

  subgraph Featured Products - Phase 4
    FP --> FPCSS[assets/featured-products-modes.css]
    FP --> ENGINE2[existing carousel logic - unchanged]
  end

  subgraph Variant Picker - Phase 5
    VCP[snippets/variant-cards-picker.liquid] --> VPJS[assets/variant-picker.js - contract preserved]
    VCPB[blocks/variant-cards-picker.liquid] --> VCP
    PT[templates/product.json - show_discount_badge on] --> VCPB
  end
```

## Reports

| Phase | Report | Status |
|-------|--------|--------|
| Conventions | `conventions-brief.md` (distilled from repo skills: motion-ui, liquid-glass-design, frontend-a11y, design-system, …) | binding contract for all phases |
| 1 — Bundle Builder removal | `phase1-bundle-cleanup.md` | 14 files neutralized + page.json cleaned; store data deliberately kept (live v4 dependency) with ready-to-run cleanup mutations |
| 2 — Badge System | `phase2-badge-system.md` | 5 layouts, 9 animation presets, metafield dropdown fixed, all surfaces covered |
| 3 — Collection Showcase | `phase3-collection-showcase.md` | 9 layout modes on the existing slideshow engine, on homepage with real collections |
| 4 — Featured Products | `phase4-featured-products.md` | +4 layout modes, badges on cards, 12 new settings, zero-regression defaults |
| 5 — Variant picker | `phase5-variant-picker.md` | discount row + −NN% chip, per-option grouping (cards + pills), JS contract verified |
| Merchant guide | `merchant-guide.md` | bilingual EN/AR usage guide |
| Removed files archive | `removed-bundle-files/` | original bundle templates pre-deletion |

## Cross-cutting guarantees

- **RTL/LTR**: logical properties only in all new CSS; carousel/swipe/keyboard
  inherited from the theme's RTL-aware slideshow engine; directional glyphs
  mirrored under `[dir="rtl"]`; `<bdi>` used for the discount chip.
- **Translations**: every new user-facing string uses `t:` keys present in BOTH
  `locales/en.default.json` and `locales/ar.json` (badge texts, showcase
  strings, price-on-selection placeholder, aria labels).
- **Accessibility**: fieldset/legend option groups, aria-labels on carousel
  controls from locale keys, focus-visible styles, ≥44px mobile touch targets,
  scrim setting for text-over-image contrast, visually-hidden price labels.
- **Performance**: lazy loading, `content-visibility: auto` virtualization,
  transform/opacity-only animations, IntersectionObserver (no scroll
  listeners), no new libraries, reveal effects no-JS-safe.
- **Reduced motion**: every animation suite has a `prefers-reduced-motion`
  kill-switch (transforms killed, autoplay paused, ≤200ms opacity only).
- **Mobile**: independent mobile layout/columns/width/animation settings in
  showcase + featured products; badge mobile size/visibility controls.

## Post-publish cleanup (manual, documented in phase 1 report)

1. Delete the 14 neutralized bundle stub files in the code editor.
2. Run the recorded `metaobjectDefinitionDelete` / `metafieldDefinitionDelete`
   mutations to drop Bundle Builder store data once no published theme uses it.
