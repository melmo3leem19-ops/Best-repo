/**
 * Request verification middleware.
 *
 *  - verifyAdmin:  embedded-admin API calls. Accepts a verified HMAC query
 *    (initial load from Shopify admin) or an X-Shop header bound to an
 *    installed shop. For production hardening, exchange this for App Bridge
 *    session-token (JWT) validation — the hook point is this one function.
 *  - verifyProxy:  storefront calls routed through the Shopify App Proxy,
 *    signed with the app secret on every request.
 */

'use strict';

const { config } = require('../config');
const { shops } = require('../db');
const { verifyQueryHmac, verifyProxySignature, isValidShopDomain } = require('../lib/hmac');

function verifyAdmin(req, res, next) {
  const shop = req.query.shop || req.get('X-Shop');
  if (!isValidShopDomain(shop)) {
    return res.status(401).json({ error: 'Missing or invalid shop' });
  }
  const record = shops.find(shop);
  if (!record) {
    return res.status(401).json({ error: 'Shop not installed', installUrl: `${config.appUrl}/auth?shop=${shop}` });
  }
  // Initial embedded loads carry a signed query string; verify when present.
  if (req.query.hmac && !verifyQueryHmac(req.query, config.apiSecret)) {
    return res.status(401).json({ error: 'Invalid HMAC' });
  }
  req.shop = shop;
  req.shopRecord = record;
  next();
}

function verifyProxy(req, res, next) {
  // App Proxy requests always include shop + signature, signed by Shopify.
  if (!verifyProxySignature(req.query, config.apiSecret)) {
    return res.status(401).json({ error: 'Invalid proxy signature' });
  }
  const shop = req.query.shop;
  const record = shops.find(shop);
  if (!record) {
    return res.status(401).json({ error: 'Shop not installed' });
  }
  req.shop = shop;
  req.shopRecord = record;
  next();
}

module.exports = { verifyAdmin, verifyProxy };
