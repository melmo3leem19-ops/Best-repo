'use strict';

const path = require('path');

/**
 * Central app configuration. Reads from process.env once at startup so the
 * rest of the codebase never touches process.env directly.
 */
const config = {
  apiKey: process.env.SHOPIFY_API_KEY || '',
  apiSecret: process.env.SHOPIFY_API_SECRET || '',
  appUrl: (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, ''),
  scopes: process.env.SHOPIFY_SCOPES || 'read_products,write_products,read_inventory,write_discounts,read_orders',
  apiVersion: process.env.SHOPIFY_API_VERSION || '2025-01',
  port: parseInt(process.env.PORT || '3000', 10),
  // Decimal places of the shop currency (2 for USD/SAR/AED, 3 for KWD/BHD/OMR).
  // All internal money math uses minor units: amount * 10^currencyDecimals.
  currencyDecimals: parseInt(process.env.CURRENCY_DECIMALS || '2', 10),
  databasePath: process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'bundle-builder.sqlite'),
  isDev: process.env.NODE_ENV !== 'production',
};

config.minorUnitFactor = 10 ** config.currencyDecimals;

function assertConfigured() {
  const missing = [];
  if (!config.apiKey) missing.push('SHOPIFY_API_KEY');
  if (!config.apiSecret) missing.push('SHOPIFY_API_SECRET');
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')} (see .env.example)`);
  }
}

module.exports = { config, assertConfigured };
