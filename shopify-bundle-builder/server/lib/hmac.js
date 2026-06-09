/**
 * HMAC verification helpers for Shopify OAuth callbacks, embedded-app
 * requests, and webhook payloads. Uses timing-safe comparison throughout.
 */

'use strict';

const crypto = require('crypto');

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verify the `hmac` query parameter on OAuth callbacks and app-proxy-less
 * embedded requests. Shopify signs the sorted query string (minus hmac).
 */
function verifyQueryHmac(query, secret) {
  const { hmac, ...rest } = query;
  if (!hmac) return false;
  const message = Object.keys(rest)
    .sort()
    .map((key) => `${key}=${Array.isArray(rest[key]) ? rest[key].join(',') : rest[key]}`)
    .join('&');
  const digest = crypto.createHmac('sha256', secret).update(message).digest('hex');
  return timingSafeEqual(digest, String(hmac));
}

/**
 * Verify an App Proxy request (`signature` param, joined without '&').
 * App Proxy is how the storefront widget reaches this server on the shop's
 * own domain (/apps/bundle-builder/...), keeping requests same-origin.
 */
function verifyProxySignature(query, secret) {
  const { signature, ...rest } = query;
  if (!signature) return false;
  const message = Object.keys(rest)
    .sort()
    .map((key) => `${key}=${Array.isArray(rest[key]) ? rest[key].join(',') : rest[key]}`)
    .join('');
  const digest = crypto.createHmac('sha256', secret).update(message).digest('hex');
  return timingSafeEqual(digest, String(signature));
}

/**
 * Verify a webhook body against the X-Shopify-Hmac-Sha256 header.
 * `rawBody` must be the unparsed request body (Buffer or string).
 */
function verifyWebhookHmac(rawBody, hmacHeader, secret) {
  if (!hmacHeader) return false;
  const digest = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64');
  return timingSafeEqual(digest, String(hmacHeader));
}

/** Validate shop domain format to prevent open-redirect / SSRF via `shop` param. */
function isValidShopDomain(shop) {
  return typeof shop === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(shop);
}

module.exports = { verifyQueryHmac, verifyProxySignature, verifyWebhookHmac, isValidShopDomain };
