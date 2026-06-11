# Almoallem Conventions Brief — Shopify Horizon Theme Features

Condensed, actionable rules for badge system, carousels, and product grids. Distilled from ECC skills:
`motion-ui`, `motion-foundations`, `motion-patterns`, `liquid-glass-design`, `frontend-a11y`, `accessibility`,
`frontend-design-direction`, `design-system`, `frontend-patterns`, `coding-standards`.
Skill code samples target React/SwiftUI; rules below are translated to vanilla CSS/JS for a Liquid theme.

---

## 1. Animation & Motion Rules

Source: `skills/motion-ui`, `skills/motion-foundations`, `skills/motion-patterns`.

### Purpose gate

- Motion must guide attention, communicate state, or preserve spatial continuity — if it does none, delete it.
- Never animate purely for decoration; never use infinite animations without a state they communicate (skeleton pulse is the exception).
- Responsiveness outranks smoothness: a 60fps animation that delays input is worse than no animation.

### Duration tokens (define once as CSS custom properties, never hardcode in component CSS)

- `--motion-instant: 80ms` — badge update, tooltip, focus ring.
- `--motion-fast: 180ms` — hover feedback, icon swap, chip/badge toggle.
- `--motion-normal: 350ms` — card expand, quick-add drawer, carousel slide settle.
- `--motion-slow: 600ms` — hero/section entrance only.
- Skeleton/loading pulse: 1.5s loop, ease-in-out (faster reads as flashing).

### Easing tokens

- `--ease-smooth: cubic-bezier(0.22, 1, 0.36, 1)` — default for entrances, reveals, carousel settle.
- `--ease-sharp: cubic-bezier(0.4, 0, 0.2, 1)` — hover/press feedback, small UI toggles.
- `--ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1)` — playful moments only (use sparingly).

### Scale and distance tokens

- Hover pop: `scale(1.04)` max; press: `scale(0.95)`; subtle: `scale(0.98)`.
- Entrance travel distances: 4 / 8 / 16 / 24px (xs/sm/md/lg); never slide elements in from > 48px.

### Performance — non-negotiable

- Animate `transform` and `opacity` ONLY; `width`, `height`, `top`, `left`, `margin`, `padding` are banned from animation.
- Animating a width-like change? Use `transform: scaleX()` with `transform-origin` instead.
- Carousel movement: translate the track with `transform: translateX()`, or use native CSS scroll-snap — never animate `left`/`margin`.
- No layout-affecting hover effects (no CLS): reserve space for hover states; badges must not reflow the card on appear.
- Scroll-reveal (IntersectionObserver) fires once per element — repeating entrances on re-scroll distract, not inform.
- Stagger interval for grid/list entrances: 50–100ms per item, hard cap 100ms; cap total staggered items (~6) so late items don't lag.
- Skip non-essential animation on low-end devices (`navigator.hardwareConcurrency <= 4`), guard with `typeof navigator !== "undefined"`.

### prefers-reduced-motion — overrides everything

- Every animated component ships a `@media (prefers-reduced-motion: reduce)` block — no exceptions.
- Under reduced motion: disable ALL transforms (`transform: none !important` on animated movement); only opacity fades ≤ 200ms permitted.
- In JS, gate animation with `window.matchMedia('(prefers-reduced-motion: reduce)').matches` and listen for changes.
- Carousel autoplay (if any) must stop entirely under reduced motion; manual navigation jumps without sliding transition.
- Motion must degrade gracefully — removal must never cause layout shift or loss of content.

---

## 2. Glassmorphism Recipe

Source: `skills/liquid-glass-design` (iOS Liquid Glass principles translated to CSS for web).

### Base glass surface (badges, overlay chips, floating carousel controls)

```css
.glass {
  background: rgb(255 255 255 / 0.55);          /* tint layer — adjust per palette */
  -webkit-backdrop-filter: blur(16px) saturate(1.4);
  backdrop-filter: blur(16px) saturate(1.4);     /* blur = material; saturate = "reflects surrounding color" */
  border: 1px solid rgb(255 255 255 / 0.35);     /* light edge = reflection highlight */
  border-radius: 16px;                           /* capsule for badges: border-radius: 999px */
  box-shadow: 0 4px 16px rgb(0 0 0 / 0.08);
}
@supports not (backdrop-filter: blur(1px)) {
  .glass { background: rgb(255 255 255 / 0.92); } /* opaque fallback — never ship unreadable text */
}
```

### Rules

- Tint for prominence: add a low-alpha brand-color background (e.g. `rgb(180 140 60 / 0.25)`) on top of the blur, mirroring `.tint()`.
- Interactive glass is opt-in: only elements that respond to touch get hover/active feedback (brighten tint + `scale(0.98)` press) — static badges stay inert.
- Apply glass to the container, after sizing/padding are settled; always pair `border-radius` with `overflow: hidden` when clipping children.
- Group sibling glass elements (badge clusters, carousel prev/next pair) in one parent and limit total glass surfaces — many separate `backdrop-filter` layers kill paint performance.
- Never nest glass inside glass; never place glass over an opaque/solid background (defeats translucency — it must sit over imagery or content).
- Reserve glass for floating/overlay elements: badges over product images, carousel arrows, sticky bars — not for every card.
- Text on glass must hold 4.5:1 contrast over the *busiest* possible backdrop — test over light and dark product photos; add a stronger tint or text-shadow if it fails.
- Test in light mode, dark mode, and over real product imagery before shipping.

---

## 3. Accessibility Rules — Badges, Carousels, Product Cards

Source: `skills/frontend-a11y`, `skills/accessibility` (WCAG 2.2 AA).

### Universal

- Text contrast: 4.5:1 normal text, 3:1 large text and UI components/icons (SC 1.4.3/1.4.11).
- Touch targets: minimum 24×24 CSS px (WCAG 2.2 SC 2.5.8); aim for 44×44px on primary mobile controls (arrows, dots, quick-add).
- Every interactive element keyboard-reachable with a visible, high-contrast focus indicator — never `outline: none` without a replacement (`:focus-visible`).
- No positive `tabindex`; never `aria-hidden="true"` on a focusable element.
- No `<div>`/`<span>` with click handlers — use `<button>` / `<a>`; a real `<a href>` for navigation, `<button type="button">` for actions.
- Never convey meaning by color alone — pair sale-red with text ("Sale", "-20%"); content must reflow at 400% zoom without loss.

### Badges

- Badges are informative, not interactive: render as `<span>`, never focusable, no hover-dependent meaning.
- Badge text must be real text (screen-reader readable), not background-image; decorative badge icons get `aria-hidden="true"`.
- Icon-only badges need visually-hidden text (e.g. `<span class="visually-hidden">New arrival</span>`).
- Badge contrast follows the 4.5:1 text rule including over glass (see §2); badge updates announced only if user-triggered (then `aria-live="polite"`).
- Don't say "Badge:" / "Image of" in labels — assistive tech announces roles already.

### Carousels

- Wrapper: `role="region"` + `aria-label="Featured products"` (or `aria-roledescription="carousel"`); each slide `aria-label="2 of 8"`.
- Prev/next are `<button>`s with `aria-label="Previous slide"` / `"Next slide"`; icon SVGs inside get `aria-hidden="true"`.
- Dots/tabs: `aria-current` (or `aria-selected`) on active dot; full Arrow-key navigation, Enter/Space activate, Escape closes any popover (PreventDefault on handled keys).
- Off-screen slides: `inert` or `aria-hidden="true"` + `tabindex="-1"` on their links so keyboard users don't tab into invisible content.
- Slide changes from user action announced via `aria-live="polite"`; autoplay (avoid it) needs a pause control and stops on hover/focus/reduced-motion.
- Scroll-snap carousels must remain natively scrollable by keyboard (focusable scroll container or arrow-key support).

### Product cards / grids

- One link per card title (the product link); don't wrap the entire card in an `<a>` containing other interactive elements — no nested interactive controls.
- Card heading levels are sequential within the page (no h2 → h4 jumps); product title is the accessible name.
- Product images: meaningful `alt` (the product name); decorative/duplicate hover images `alt=""` `aria-hidden="true"`.
- Price for screen readers: render compare-at/sale price with visually-hidden labels ("Regular price… Sale price…"), not just strikethrough styling.
- Quick-add result announced via `aria-live="polite"` status region; errors use `role="alert"`.
- Quick-view/modal: `role="dialog"` `aria-modal="true"` `aria-labelledby`, focus moves in on open, is trapped while open, Escape closes, focus restores to trigger on close.
- Hover-revealed actions (quick add, swatches) must also appear on `:focus-within` — keyboard users get the same affordances.

---

## 4. Design Direction Rules

Source: `skills/frontend-design-direction`, `skills/design-system`.

- Pick the direction before coding: purpose, audience, tone (here: refined/premium retail), one memorable detail, constraints — then commit.
- Premium feel = restraint: quiet palette, generous whitespace, fewer but better effects — not gradients-on-everything.
- Use Horizon's existing settings, tokens, color schemes, and components before inventing a new visual system.
- Typography: clear hierarchy h1 > h2 > h3 > body > caption; contextual sizing over generic oversized hero text; long Arabic/English labels must wrap or resize, never overflow.
- Spacing: one consistent rhythm (4/8/16/24/32px scale) everywhere — arbitrary one-off margins are the #1 "looks off" cause.
- Palette: multi-dimensional but never one-note; all colors from theme color-scheme tokens, no random hex in section CSS.
- First viewport shows products, not marketing chrome; hierarchy supports scanning and repeated daily use.
- Grids, tiles, toolbars, and carousel controls keep stable dimensions — hover states and label changes must not shift layout.
- Motion is sparse and high-signal: clarifies state changes, never masks slowness.
- AI-slop blacklist: purple-to-blue gradients, decorative blobs, cards inside cards, glass on everything, rounded corners on everything, scroll-animation overload, generic centered-hero-over-gradient.
- Polish checklist per component: hover state, focus state, loading state, empty state, dark/light scheme — all five or it's unfinished.
- New dependency for a visual flourish must clearly pay for itself; default is no.

---

## 5. CSS/JS Conventions

Source: `skills/coding-standards`, `skills/frontend-patterns`, `skills/design-system` (adapted to Liquid/vanilla web).

### CSS

- All design values flow through CSS custom properties (`--motion-*`, `--ease-*`, color/spacing tokens) defined at `:root`/section level; no magic numbers in rules.
- BEM-ish naming, lowercase-hyphen: `.product-badge`, `.product-badge__label`, `.product-badge--sale`; block = component, `__` element, `--` modifier.
- One component = one stylesheet (`assets/component-product-badge.css`), loaded only by the sections/snippets that use it; no global dumping ground.
- Mobile-first: base styles target small screens; enhance with `@media screen and (min-width: 750px)` / `990px` (Horizon breakpoints) — never desktop-first max-width overrides.
- RTL via logical properties only: `margin-inline-start`, `padding-inline`, `inset-inline-end`, `text-align: start`, `border-start-start-radius` — never `left`/`right` physical properties (the store serves Arabic).
- Directional transforms (carousel arrows, slide offsets) must account for `dir="rtl"`: flip with `[dir="rtl"]` selectors or logical-aware JS, and mirror arrow icons.
- Keep selector specificity flat (single class); no `!important` except in the reduced-motion kill-switch; no inline styles except Liquid-computed values (use custom properties for those: `style="--badge-color: {{ ... }}"`).

### JS

- Plain modern JS (`const`/`let`, never `var`; prefer `const`), small modules in `assets/` (`product-badge.js`, `carousel.js`); no framework, no build-step dependency.
- Components as custom elements or init-on-DOM-ready modules scoped to their section; must survive Shopify section reloads (`shopify:section:load` re-init).
- Descriptive verb-noun naming: `updateBadgeVisibility()`, `goToSlide()`, `isLastSlide` — camelCase functions/variables, named constants over magic numbers (`const SWIPE_THRESHOLD_PX = 40`).
- Readability first; KISS/DRY/YAGNI: extract shared helpers, don't build options nobody asked for; functions < 50 lines; early returns over deep nesting.
- Don't mutate shared state in place — derive new values; treat config objects as immutable.
- Comprehensive error handling on every `fetch` (Cart/Section Rendering API): check `response.ok`, surface a user-readable failure, never swallow; parallelize independent requests with `Promise.all`.
- Debounce input-driven work (resize, scroll, search) — ~200–500ms; use IntersectionObserver for visibility, not scroll listeners.
- Lazy-load below-the-fold work: `loading="lazy"` images, defer carousel init until near viewport; clean up observers/listeners on section unload.
- Comments explain WHY, not WHAT; file naming lowercase-with-hyphens throughout.

### Testing/verification before shipping a feature

- Verify keyboard-only pass, screen-reader labels, reduced-motion pass, RTL render, 400% zoom reflow, and no CLS on hover/badge-render — every feature, every time.
