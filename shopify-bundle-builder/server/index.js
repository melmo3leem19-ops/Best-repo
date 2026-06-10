/**
 * Shopify Bundle Builder — app server entry point.
 *
 * Routing map:
 *   /auth, /auth/callback      OAuth install flow
 *   /webhooks/*                Shopify webhooks (raw body, HMAC-verified)
 *   /api/*                     Embedded admin panel API (verifyAdmin)
 *   /proxy/*                   Storefront App Proxy API (verifyProxy)
 *   /admin/*                   Static embedded admin panel
 */

'use strict';

const path = require('path');
const express = require('express');
const { config, assertConfigured } = require('./config');
const db = require('./db');
const authRoutes = require('./routes/auth');
const webhookRoutes = require('./routes/webhooks');
const bundleRoutes = require('./routes/bundles');
const storefrontRoutes = require('./routes/storefront');
const { verifyAdmin, verifyProxy } = require('./middleware/verify-request');

function createApp() {
  const app = express();
  app.disable('x-powered-by');

  // Webhooks need the raw body for HMAC — mount BEFORE the JSON parser.
  app.use('/webhooks', webhookRoutes);

  app.use(express.json({ limit: '1mb' }));

  // Allow embedding inside the Shopify admin iframe.
  app.use((req, res, next) => {
    res.setHeader(
      'Content-Security-Policy',
      "frame-ancestors https://*.myshopify.com https://admin.shopify.com;"
    );
    next();
  });

  app.use(authRoutes);
  app.use('/api', verifyAdmin, bundleRoutes);
  app.use('/proxy', verifyProxy, storefrontRoutes);

  // Embedded admin panel (static SPA).
  app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));
  app.get('/', (req, res) => {
    if (req.query.shop) return res.redirect(`/admin/?shop=${req.query.shop}`);
    res.send('Shopify Bundle Builder is running. Install via /auth?shop=your-store.myshopify.com');
  });

  app.get('/healthz', (req, res) => res.json({ ok: true }));

  return app;
}

if (require.main === module) {
  assertConfigured();
  db.init();
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`[bundle-builder] listening on :${config.port} (${config.isDev ? 'dev' : 'production'})`);
  });
}

module.exports = { createApp };
