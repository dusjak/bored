import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

import { isBackendSyncEnabled } from '@/config/features';
import { createChunkedStorage, secureStoreKey } from '@/lib/chunkedStorage';

/**
 * Auth session storage for Expo Go.
 * The session JSON is larger than the old 2048-byte Keychain limit, so it is chunked.
 * Nothing here runs unless `getSupabase` is called, and that throws while sync is off.
 */
const authStorage = createChunkedStorage({
  async getItem(key) {
    return SecureStore.getItemAsync(secureStoreKey(key));
  },
  async setItem(key, value) {
    await SecureStore.setItemAsync(secureStoreKey(key), value);
  },
  async removeItem(key) {
    await SecureStore.deleteItemAsync(secureStoreKey(key));
  },
});

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!isBackendSyncEnabled()) throw new Error('Backend sync is off');
  if (client) return client;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) throw new Error('Backend sync is off');
  client = createClient(url, anonKey, {
    auth: {
      storage: authStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return client;
}
