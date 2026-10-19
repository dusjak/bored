/**
 * Product switches. `backendSync` stays off unless a human turns it on.
 * Signed-out and local-only is the normal state of the app.
 */
export type BackendSyncEnv = Record<string, string | undefined>;

function present(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Sync is on only when the explicit flag is `1` or `true` and both Supabase
 * public env vars are non-empty. Anything else, including a missing flag, is off.
 */
export function isBackendSyncEnabled(env: BackendSyncEnv = process.env): boolean {
  const flag = env.EXPO_PUBLIC_BACKEND_SYNC;
  const explicit = flag === '1' || flag === 'true';
  return explicit && present(env.EXPO_PUBLIC_SUPABASE_URL) && present(env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
}

export const features = {
  get backendSync(): boolean {
    return isBackendSyncEnabled();
  },
};
