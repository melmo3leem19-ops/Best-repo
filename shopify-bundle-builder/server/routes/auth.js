/**
 * OAuth routes — standard Shopify authorization-code grant.
 *
 *   GET /auth?shop=x.myshopify.com   -> redirect to Shopify consent screen
 *   GET /auth/callback               -> exchange code for token, register webhooks
 */

'use strict';

const crypto = require('crypto');
const express = require('express');
const { config } = require('../config');
const { shops } = require('../db');
const { verifyQueryHmac, isValidShopDomain } = require('../lib/hmac');
const { ShopifyClient } = require('../lib/shopify-client');

const router = express.Router();

// In-memory nonce store; for multi-instance deploys move this to the DB.
const pendingNonces = new Map();

router.get('/auth', (req, res) => {
  const shop = req.query.shop;
  if (!isValidShopDomain(shop)) {
    return res.status(400).send('Invalid shop parameter. Expected your-store.myshopify.com');
  }

  const nonce = crypto.randomBytes(16).toString('hex');
  pendingNonces.set(nonce, { shop, createdAt: Date.now() });

  const authUrl =
    `https://${shop}/admin/oauth/authorize` +
    `?client_id=${config.apiKey}` +
    `&scope=${encodeURIComponent(config.scopes)}` +
    `&redirect_uri=${encodeURIComponent(`${config.appUrl}/auth/callback`)}` +
    `&state=${nonce}`;

  res.redirect(authUrl);
});

router.get('/auth/callback', async (req, res) => {
  try {
    const { shop, code, state } = req.query;

    const pending = pendingNonces.get(state);
    pendingNonces.delete(state);
    if (!pending || pending.shop !== shop) {
      return res.status(403).send('Invalid OAuth state');
    }
    if (!isValidShopDomain(shop) || !verifyQueryHmac(req.query, config.apiSecret)) {
      return res.status(403).send('HMAC validation failed');
    }

    const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: config.apiKey,
        client_secret: config.apiSecret,
        code,
      }),
    });
    if (!tokenRes.ok) throw new Error(`Token exchange failed: HTTP ${tokenRes.status}`);
    const { access_token: accessToken, scope } = await tokenRes.json();

    shops.upsert(shop, accessToken, scope);

    // Keep the product cache and install state fresh.
    const client = new ShopifyClient(shop, accessToken);
    await client.registerWebhook('PRODUCTS_UPDATE', `${config.appUrl}/webhooks/products-update`);
    await client.registerWebhook('PRODUCTS_DELETE', `${config.appUrl}/webhooks/products-delete`);
    await client.registerWebhook('APP_UNINSTALLED', `${config.appUrl}/webhooks/app-uninstalled`);

    // Land on the embedded admin inside the Shopify admin.
    res.redirect(`https://${shop}/admin/apps/${config.apiKey}`);
  } catch (err) {
    console.error('[auth] callback failed:', err.message);
    res.status(500).send('Installation failed. Check server logs.');
  }
});

module.exports = router;
