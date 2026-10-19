import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SECURE_STORE_CHUNK, createChunkedStorage, secureStoreKey, type KeyValueStore } from './chunkedStorage.ts';

function memoryStore(): KeyValueStore & { keys(): string[] } {
  const values = new Map<string, string>();
  return {
    async getItem(key) {
      return values.get(key) ?? null;
    },
    async setItem(key, value) {
      values.set(key, value);
    },
    async removeItem(key) {
      values.delete(key);
    },
    keys() {
      return [...values.keys()];
    },
  };
}

describe('chunked auth storage', () => {
  it('round-trips a value larger than one SecureStore slot', async () => {
    const inner = memoryStore();
    const storage = createChunkedStorage(inner, 8);
    const value = 'abcdefghijklmnopqrstuvwxyz';
    await storage.setItem('sb-auth-token', value);
    assert.equal(await storage.getItem('sb-auth-token'), value);
    assert.ok(inner.keys().every((key) => key !== 'sb-auth-token'));
    for (const key of inner.keys()) {
      const stored = await inner.getItem(key);
      assert.ok((stored ?? '').length <= 8 || key.endsWith('.chunk.count'));
    }
  });

  it('drops leftover chunks when a value shrinks', async () => {
    const inner = memoryStore();
    const storage = createChunkedStorage(inner, 4);
    await storage.setItem('token', '12345678');
    await storage.setItem('token', 'abcd');
    assert.equal(await storage.getItem('token'), 'abcd');
    assert.equal(await inner.getItem('token.chunk.1'), null);
  });

  it('removes every chunk', async () => {
    const inner = memoryStore();
    const storage = createChunkedStorage(inner, 4);
    await storage.setItem('token', '12345678');
    await storage.removeItem('token');
    assert.equal(await storage.getItem('token'), null);
    assert.deepEqual(inner.keys(), []);
  });

  it('keeps each chunk inside the Keychain limit', () => {
    assert.ok(SECURE_STORE_CHUNK < 2048);
    assert.equal(secureStoreKey('sb-project-auth-token'), 'sb-project-auth-token');
    assert.equal(secureStoreKey('sb/project auth'), 'sb_project_auth');
  });
});
