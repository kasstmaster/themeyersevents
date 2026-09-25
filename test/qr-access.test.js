import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccountQrToken, ensureAccountQrAccess, QR_TOKEN_PATTERN } from '../scripts/qr-access.js';

test('creates a 256-bit URL-safe opaque token', () => {
  const first = createAccountQrToken();
  const second = createAccountQrToken();
  assert.match(first, QR_TOKEN_PATTERN);
  assert.match(second, QR_TOKEN_PATTERN);
  assert.notEqual(first, second);
});

test('backfills only accounts missing QR access and is idempotent', () => {
  const existing = 'A'.repeat(43);
  const generated = ['B'.repeat(43), 'C'.repeat(43)];
  const accounts = [{ name: 'Existing', qrToken: existing }, { name: 'Older' }, { name: 'New' }];
  assert.equal(ensureAccountQrAccess(accounts, () => generated.shift()), 2);
  assert.deepEqual(accounts.map(account => account.qrToken), [existing, 'B'.repeat(43), 'C'.repeat(43)]);
  assert.equal(ensureAccountQrAccess(accounts, () => { throw new Error('must not regenerate'); }), 0);
  assert.equal(accounts[0].qrToken, existing);
});

test('rejects a duplicate generated token and retries', () => {
  const existing = 'A'.repeat(43);
  const generated = [existing, 'B'.repeat(43)];
  const accounts = [{ name: 'Existing', qrToken: existing }, { name: 'Missing' }];
  assert.equal(ensureAccountQrAccess(accounts, () => generated.shift()), 1);
  assert.equal(accounts[1].qrToken, 'B'.repeat(43));
});
