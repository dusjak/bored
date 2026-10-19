import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { features, isBackendSyncEnabled } from './features.ts';

const ENV_KEYS = ['EXPO_PUBLIC_BACKEND_SYNC', 'EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'] as const;

describe('backend sync flag', () => {
  it('is off unless the explicit flag and both Supabase values are set', () => {
    assert.equal(isBackendSyncEnabled({}), false);
    assert.equal(
      isBackendSyncEnabled({
        EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      }),
      false,
    );
    assert.equal(
      isBackendSyncEnabled({
        EXPO_PUBLIC_BACKEND_SYNC: '1',
        EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      }),
      false,
    );
    assert.equal(
      isBackendSyncEnabled({
        EXPO_PUBLIC_BACKEND_SYNC: '1',
        EXPO_PUBLIC_SUPABASE_URL: '   ',
        EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      }),
      false,
    );
    assert.equal(
      isBackendSyncEnabled({
        EXPO_PUBLIC_BACKEND_SYNC: '0',
        EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      }),
      false,
    );
    assert.equal(
      isBackendSyncEnabled({
        EXPO_PUBLIC_BACKEND_SYNC: 'yes',
        EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      }),
      false,
    );
    assert.equal(
      isBackendSyncEnabled({
        EXPO_PUBLIC_BACKEND_SYNC: '1',
        EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      }),
      true,
    );
    assert.equal(
      isBackendSyncEnabled({
        EXPO_PUBLIC_BACKEND_SYNC: 'true',
        EXPO_PUBLIC_SUPABASE_URL: ' https://example.supabase.co ',
        EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      }),
      true,
    );
  });

  it('ships off by default', () => {
    const previous = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
    for (const key of ENV_KEYS) delete process.env[key];
    try {
      assert.equal(features.backendSync, false);
      assert.equal(isBackendSyncEnabled(), false);
    } finally {
      for (const key of ENV_KEYS) {
        const value = previous[key];
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });
});
