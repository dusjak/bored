/** Historical iOS Keychain reads failed above about 2048 bytes. Stay under that. */
export const SECURE_STORE_CHUNK = 1800;

export type KeyValueStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

const COUNT_SUFFIX = '.chunk.count';

function countKey(key: string): string {
  return `${key}${COUNT_SUFFIX}`;
}

function chunkKey(key: string, index: number): string {
  return `${key}.chunk.${index}`;
}

/**
 * Splits a value across several keys so a session JWT fits in SecureStore.
 * A missing count means "this key was stored whole", which keeps a one-key read working.
 */
export function createChunkedStorage(store: KeyValueStore, chunkSize = SECURE_STORE_CHUNK): KeyValueStore {
  return {
    async getItem(key) {
      const rawCount = await store.getItem(countKey(key));
      if (rawCount == null) return store.getItem(key);
      const count = Number(rawCount);
      if (!Number.isInteger(count) || count < 0) return null;
      const parts: string[] = [];
      for (let index = 0; index < count; index += 1) {
        const part = await store.getItem(chunkKey(key, index));
        if (part == null) return null;
        parts.push(part);
      }
      return parts.join('');
    },
    async setItem(key, value) {
      const previous = await store.getItem(countKey(key));
      const count = value.length === 0 ? 0 : Math.ceil(value.length / chunkSize);
      for (let index = 0; index < count; index += 1) {
        await store.setItem(chunkKey(key, index), value.slice(index * chunkSize, (index + 1) * chunkSize));
      }
      await store.setItem(countKey(key), String(count));
      const previousCount = previous == null ? 0 : Number(previous);
      if (Number.isInteger(previousCount)) {
        for (let index = count; index < previousCount; index += 1) {
          await store.removeItem(chunkKey(key, index));
        }
      }
      await store.removeItem(key);
    },
    async removeItem(key) {
      const rawCount = await store.getItem(countKey(key));
      const count = rawCount == null ? 0 : Number(rawCount);
      if (Number.isInteger(count)) {
        for (let index = 0; index < count; index += 1) await store.removeItem(chunkKey(key, index));
      }
      await store.removeItem(countKey(key));
      await store.removeItem(key);
    },
  };
}

/** SecureStore keys may only contain letters, numbers, ".", "-", and "_". */
export function secureStoreKey(key: string): string {
  const cleaned = key.replace(/[^\w.-]/g, '_');
  if (!cleaned) throw new Error('SecureStore key is empty');
  return cleaned;
}
