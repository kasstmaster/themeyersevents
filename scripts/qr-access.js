import { randomBytes } from 'node:crypto';

export const QR_TOKEN_BYTES = 32;
export const QR_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function createAccountQrToken() {
  return randomBytes(QR_TOKEN_BYTES).toString('base64url');
}

/** Add permanent opaque QR locators only where one does not already exist. */
export function ensureAccountQrAccess(accounts, createToken = createAccountQrToken) {
  const used = new Set(accounts.map(account => account?.qrToken).filter(Boolean));
  let created = 0;
  for (const account of accounts) {
    if (!account || account.qrToken) continue;
    let token;
    do { token = createToken(); } while (!QR_TOKEN_PATTERN.test(token) || used.has(token));
    account.qrToken = token;
    used.add(token);
    created += 1;
  }
  return created;
}
