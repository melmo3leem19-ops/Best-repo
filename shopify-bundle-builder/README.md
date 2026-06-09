# Shopify Bundle Builder (RTL + LTR)

A production-grade, self-hosted Shopify bundle builder — feature-comparable to
BundleSuite, fully under your control, and built from day one for **Arabic (RTL)
and English (LTR)** storefronts.

## Feature Overview

| Area | What's included |
|---|---|
| Bundle types | Mix & Match, Build Your Own Bundle (BYOB), Box Builder (step-by-step), Fixed bundles, Infinite Options, Combo/Kits |
| Discounts | BOGO, Buy X Get Y, tiered (buy more save more), volume/unit pricing, fixed bundle price, progressive (per completed step), free gifts — with "best" or "stack" resolution |
| Storefront UX | Multi-step flow with review screen, real-time server-verified pricing, progress bar, "add N more to save X%" upsell nudge, sticky add-to-cart bar, lazy-loaded images, skeleton loading, mobile-first grid |
| RTL/LTR | Auto-detected from the store locale (`ar`, `he`, `fa`, `ur` → RTL). CSS logical properties mirror the entire layout; Arabic UI strings built in; Arabic-optimized font options (Tajawal, Cairo) |
| Shopify integration | OAuth install, Admin GraphQL API, App Proxy (same-origin storefront calls), webhook-fed product/inventory cache, Ajax Cart API (`/cart/add.js`), native checkout via single-use discount codes — **no checkout hacks** |
| Admin panel | Embedded dashboard (Arabic/English toggle): create/edit bundles, product search picker, min/max rules, step editor, discount rule builder, template picker, activate/deactivate, per-bundle analytics |
| Templates | Minimal, Premium, Box Builder — colors, fonts, spacing, corner radius all configurable from the theme editor |
| Analytics | Views, add-to-carts, purchases, revenue and conversion rate per bundle; Facebook Pixel (`fbq`) and Google Analytics (`gtag`) events fired automatically when present |
| Performance | One CSS + one JS asset served from the Shopify CDN, `defer`-loaded, zero dependencies, lazy images, debounced pricing calls, SQLite product cache so storefront requests never block on the Admin API |

## Architecture

```
shopify-bundle-builder/
├── server/                  Node.js (Express, CommonJS)
│   ├── index.js             App bootstrap + routing map
│   ├── config.js            Env-driven configuration
│   ├── db.js                SQLite persistence (shops, bundles, analytics, product cache)
│   ├── lib/
│   │   ├── discount-engine.js   Pure pricing logic (all money in minor units)
│   │   ├── bundle-validator.js  Selection + definition validation (i18n error keys)
│   │   ├── shopify-client.js    Admin GraphQL client with throttle retry
│   │   ├── inventory.js         Cache-first inventory validation
│   │   └── hmac.js              OAuth / App Proxy / webhook signature checks
│   ├── middleware/verify-request.js
│   └── routes/              auth, bundles (admin API), storefront (proxy), webhooks
├── admin/                   Embedded admin SPA (vanilla JS, AR/EN, RTL-aware)
├── extension/               Theme app extension
│   ├── blocks/bundle-builder.liquid   Theme editor block (auto dir="rtl")
│   ├── assets/bundle-builder.js       Storefront widget (vanilla JS)
│   ├── assets/bundle-builder.css      Logical-properties CSS + 3 templates
│   └── locales/             en + ar
├── tests/                   Pure-logic test suite (no install needed)
├── shopify.app.toml         Shopify CLI app config (App Proxy, scopes)
└── .env.example
```

**Request flow at add-to-cart time** (the part that keeps checkout honest):

1. Widget POSTs selections (IDs + quantities only — *never prices*) to
   `/apps/bundle-builder/checkout` (App Proxy → `/proxy/checkout`, signature-verified).
2. Server validates rules, re-prices from its own product data, validates live inventory.
3. If there's a discount, the server mints a **single-use Shopify discount code**
   for exactly that amount, scoped to the bundle's variants.
4. Widget adds all lines in one `/cart/add.js` call (each tagged with
   `_bundle_id` / `_bundle_key` properties), then redirects through
   `/discount/CODE?redirect=/cart` so the discount survives natively into checkout.
5. The `orders/create` webhook attributes revenue back to the bundle.

## RTL Implementation Notes

- The Liquid block derives `dir` from `request.locale.iso_code` — Arabic stores
  get a mirrored UI with zero configuration.
- All CSS uses logical properties (`margin-inline-start`, `inset-inline-end`,
  `text-align: start`, `border-block-end`…), so there is **no separate RTL
  stylesheet** to drift out of sync.
- Direction-aware details handled explicitly: progress fill grows from the start
  edge, skeleton shimmer reverses, toasts re-center, the admin JSON editor stays
  LTR even inside the Arabic admin.
- All shopper-facing strings ship in English and Arabic inside the widget;
  add more languages by extending the `I18N` table in `bundle-builder.js`.

---

## Step-by-Step Setup Guide

### 1. Set up the Shopify app (Partner Dashboard)

1. Create a [Shopify Partner account](https://partners.shopify.com) and a
   development store if you don't have one.
2. Partner Dashboard → **Apps → Create app → Create app manually**. Name it
   "Bundle Builder".
3. Copy the **Client ID** and **Client secret** into `.env`
   (`SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`) — see `.env.example`.
4. Under **App setup**:
   - **App URL**: `https://YOUR_DOMAIN` (use an `ngrok`/`cloudflared` tunnel in dev).
   - **Allowed redirection URL**: `https://YOUR_DOMAIN/auth/callback`.
   - **App proxy**: prefix `apps`, subpath `bundle-builder`,
     proxy URL `https://YOUR_DOMAIN/proxy`. *(This is required — the storefront
     widget talks to the server through it.)*
5. Run the server:

   ```bash
   cd shopify-bundle-builder
   npm install
   cp .env.example .env   # fill in your values
   npm start
   ```

### 2. Install in your store

Open `https://YOUR_DOMAIN/auth?shop=your-store.myshopify.com`, approve the
scopes, and you'll land in the embedded admin. Install registers the
`products/update`, `products/delete` and `app/uninstalled` webhooks
automatically. Also subscribe to `orders/create` →
`https://YOUR_DOMAIN/webhooks/orders-create` (Partner Dashboard → API
webhooks, or add a `registerWebhook` call) for revenue attribution.

### 3. Create your first bundle

1. In the admin panel click **New bundle**.
2. Pick a type — start with **Mix & Match**, set *Min items* = 2.
3. Add a discount rule, e.g. **tiered**:

   ```json
   { "type": "tiered", "label": "Buy more, save more",
     "tiers": [ { "minQty": 3, "discountPercent": 10 },
                { "minQty": 5, "discountPercent": 20 } ] }
   ```

   *(All prices/amounts are in minor units: `4900` = 49.00.)*
4. Save, then click **Activate**. Note the **handle** shown on the bundle —
   you'll paste it into the theme block.

### 4. Connect products

In the bundle editor, type into **Search products** — it queries your live
catalog via the Admin API. Click **Add** on each product. For *Fixed* bundles
set the exact quantity per product; for *Box Builder* assign each product a
step number and define the steps (title, min/max) in the Steps panel. Products
stay in sync automatically via webhooks (price, inventory, deletions).

### 5. Customize the UI

1. Online Store → **Customize** → add section → **Apps → Bundle Builder**.
2. Paste the bundle **handle** into the block settings.
3. Pick a template (Minimal / Premium / Box Builder) and adjust accent color,
   text color, corner radius, spacing and font — all live-previewed in the
   theme editor. For deeper changes, the CSS custom properties at the top of
   `extension/assets/bundle-builder.css` are the single theming surface.

### 6. Enable RTL

Nothing to enable — RTL is automatic:

1. Shopify admin → Settings → **Languages** → add **Arabic** and publish it.
2. When a shopper browses the Arabic locale, the block renders with
   `dir="rtl"`, Arabic strings, mirrored layout, and reversed animations.
3. Optionally pick **Tajawal** or **Cairo** in the block's font setting for
   better Arabic typography (load the font in your theme or via a font app).
4. To force RTL for testing, set `dir="rtl"` on the `.bb-root` element in the
   browser inspector.

### 7. Test bundles

- **Logic tests** (no store needed): `node tests/run-all.js` — covers every
  discount type, stacking, validation and edge cases (28 tests).
- **End-to-end on a dev store**:
  1. Activate a bundle, open the page with the block.
  2. Verify live price updates, the upsell nudge, and step min/max blocking.
  3. Add to cart — confirm the cart shows the items with the bundle property,
     the discount is applied, and checkout shows the reduced total.
  4. Set a product's inventory to 0 and confirm the widget blocks it (409).
  5. Switch the storefront to Arabic and repeat — layout must mirror fully.
  6. Place a test order and check the bundle's revenue in the admin analytics.

### 8. Deploy to production

1. Host the server anywhere Node ≥18 runs (Railway, Render, Fly.io, a VPS).
   Set the env vars from `.env.example`; mount a persistent volume for
   `DATABASE_PATH` (SQLite). Put it behind HTTPS — Shopify requires it.
2. Update the Partner Dashboard URLs (App URL, redirect URL, App Proxy URL)
   to the production domain, and `APP_URL` in the environment.
3. Deploy the theme extension with the Shopify CLI:

   ```bash
   npm install -g @shopify/cli
   shopify app config link   # links shopify.app.toml to your Partner app
   shopify app deploy        # pushes extension/ — assets go to Shopify's CDN
   ```

4. Re-run the install URL once against the production domain so webhooks
   point at it.
5. Scaling later: swap `server/db.js` for Postgres (it's the only persistence
   surface), move OAuth nonces out of memory, and add App Bridge session-token
   verification in `server/middleware/verify-request.js` (the hook point is
   documented there).

---

## Conversion patterns baked in (from top bundle-builder stores)

- **Progress + scarcity of choice**: visible step progress and "X of Y selected"
  counters reduce abandonment in multi-step flows.
- **Live savings framing**: the sticky bar always shows *"You save …"* rather
  than only the discounted total — savings framing outperforms price framing.
- **Next-tier nudge**: "Add 2 more to save 20%" at the exact moment of decision
  is the single highest-leverage AOV pattern in bundle UIs.
- **One-tap quantity steppers** on cards instead of navigation to product pages.
- **Sticky add-to-cart** keeps the action reachable on long mobile grids.
- **Atomic cart add**: all bundle lines land in one Ajax call, so the shopper
  never sees a half-added bundle.

## Security model

- OAuth callback: state nonce + HMAC verification; `shop` parameter format-validated.
- Storefront API: every request verified against the App Proxy signature.
- Webhooks: raw-body HMAC verification before parsing.
- Pricing: clients send only IDs and quantities; prices and discounts are always
  computed server-side, and discount codes are single-use and variant-scoped.

## License

MIT — yours to run, modify and extend. No third-party bundle app required.
