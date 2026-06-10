#!/usr/bin/env node
/**
 * Test runner — executes every *.test.js in this directory.
 * Pure-logic tests only (discount engine, validators); no Shopify access
 * or dependency install required.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const files = fs
  .readdirSync(__dirname)
  .filter((f) => f.endsWith('.test.js'))
  .sort();

let failed = 0;
for (const file of files) {
  try {
    execFileSync(process.execPath, [path.join(__dirname, file)], { stdio: 'inherit' });
  } catch {
    failed++;
  }
}

console.log(failed === 0 ? `\nAll ${files.length} test files passed.` : `\n${failed} test file(s) FAILED.`);
process.exit(failed === 0 ? 0 : 1);
