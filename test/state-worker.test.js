import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../github-state-worker/worker.js';

function uploadRequest(body, headers = {}) {
  return new Request('https://state.example/invitation-backgrounds/template-123', {
    method: 'PUT',
    headers: { 'Content-Type': 'image/png', 'X-Host-Password': 'secret', ...headers },
    body
  });
}

test('invitation uploads are buffered before being stored in R2', async () => {
  const bytes = new Uint8Array([137, 80, 78, 71]);
  let stored;
  const env = {
    HOST_PASSWORD: 'secret',
    INVITATION_BACKGROUNDS: {
      async put(key, value, options) {
        assert.ok(value instanceof ArrayBuffer);
        stored = { key, bytes: [...new Uint8Array(value)], options };
      }
    }
  };

  const response = await worker.fetch(uploadRequest(bytes), env);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(stored.key, 'invitation-backgrounds/template-123');
  assert.deepEqual(stored.bytes, [...bytes]);
  assert.equal(stored.options.httpMetadata.contentType, 'image/png');
});

test('invitation uploads reject an oversized body without a Content-Length header', async () => {
  let stored = false;
  const env = {
    HOST_PASSWORD: 'secret',
    INVITATION_BACKGROUNDS: { async put() { stored = true; } }
  };
  const request = uploadRequest(new Uint8Array(15_000_001));
  request.headers.delete('Content-Length');

  const response = await worker.fetch(request, env);

  assert.equal(response.status, 413);
  assert.equal(await response.text(), 'Image is too large (15 MB maximum).');
  assert.equal(stored, false);
});
