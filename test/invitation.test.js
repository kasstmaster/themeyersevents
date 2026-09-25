import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

await import('../invitation.js');
const Invitation = globalThis.Invitation;

const identities = {
  christmas: 'd7e0843cdb7b76032f57959cf5b56ca6a6299d1a45ae5f76d6010a7ee15b198d',
  thanksgiving: '30de56721e4949b947fed63d0446af39b90bbe364af796604bb8b55500ef6008',
  wedding: 'ad8cc400711c6f27f8f528bac9ce465689de2023547261b837d89b9951881fa7'
};

test('all three locked masters retain their attached PNG identity and dimensions', async () => {
  for (const [id, expectedHash] of Object.entries(identities)) {
    const template = Invitation.TEMPLATES[id];
    assert.equal(template.width, 720); assert.equal(template.height, 1008);
    const encoded = await readFile(new URL(`../${template.image}`, import.meta.url), 'utf8');
    const bytes = Buffer.from(encoded.trim(), 'base64');
    assert.equal(bytes.readUInt32BE(16), 720); assert.equal(bytes.readUInt32BE(20), 1008);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), expectedHash);
  }
});

test('locked field and QR geometry is deterministic and inside each canvas', () => {
  for (const template of Object.values(Invitation.TEMPLATES)) {
    for (const [name, field] of Object.entries(template.fields)) {
      if (!field) continue;
      assert.ok(field.x >= 0 && field.y >= 0, name);
      assert.ok(field.x + field.width <= template.width, name);
      assert.ok(field.y + field.height <= template.height, name);
      assert.equal(field.align, 'center');
    }
    assert.equal(template.qr.width, template.qr.height);
    assert.ok(template.qr.x + template.qr.width <= template.width);
    assert.ok(template.qr.y + template.qr.height <= template.height);
    assert.equal(template.qr.quietZone, 4);
  }
});

test('date and RSVP strings follow each source template style', () => {
  assert.equal(Invitation.formatEventDate('christmas', '2026-12-19'), 'Saturday DECEMBER 19 2026');
  assert.equal(Invitation.formatEventDate('thanksgiving', '2027-11-25'), 'THURSDAY NOVEMBER 25 2027');
  assert.deepEqual(Invitation.formatEventDate('wedding', '2027-08-10'), ['TUESDAY, 10 OF AUGUST', 'Two thousand and twenty-seven']);
  assert.equal(Invitation.formatRsvpDate('2026-12-05'), 'BY DEC. 5');
});

test('year and address changes affect only intended values, never layout or QR token', () => {
  const account = { name: 'Account A', qrToken: 'stable-token-a' };
  const before = Invitation.invitationModel('christmas', { eventDate: '2026-12-19', rsvpDate: '2026-12-05', addressLine1: '221 W China Grade Loop', addressLine2: 'Bakersfield CA 93308' }, `#/signin/account/${account.qrToken}`);
  const after = Invitation.invitationModel('christmas', { eventDate: '2028-12-23', rsvpDate: '2028-12-09', addressLine1: '10 New Address', addressLine2: 'New City CA 90000' }, `#/signin/account/${account.qrToken}`);
  assert.strictEqual(before.template, after.template);
  assert.deepEqual(before.template.qr, after.template.qr);
  assert.equal(account.qrToken, 'stable-token-a');
  assert.notDeepEqual(before.values, after.values);
  assert.deepEqual(Object.keys(after.values).sort(), ['addressLine1', 'addressLine2', 'eventDate', 'rsvpBy']);
});

test('two accounts keep distinct established QR payloads and safe human filenames', () => {
  const state = { eventDate: '2026-12-19', rsvpDate: '2026-12-05', addressLine1: 'One', addressLine2: 'Two' };
  const a = Invitation.invitationModel('christmas', state, 'https://example.test/#/signin/account/token-a');
  const b = Invitation.invitationModel('christmas', state, 'https://example.test/#/signin/account/token-b');
  assert.notEqual(a.qrUrl, b.qrUrl); assert.deepEqual(a.values, b.values);
  assert.equal(Invitation.filenameFor('Ben Hall IV / Sherri Hall', 'Christmas'), 'Ben-Hall-IV-Sherri-Hall-Christmas-Invitation.png');
  assert.ok(!Invitation.filenameFor('Ben / Sherri', 'Christmas').includes('token'));
});
