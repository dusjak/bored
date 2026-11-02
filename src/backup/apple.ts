import * as AppleAuthentication from 'expo-apple-authentication';

export type AppleSheetResult = 'ok' | 'cancelled' | 'failed';

function cancelled(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'ERR_REQUEST_CANCELED'
  );
}

/**
 * Opens the system Sign in with Apple sheet with no scopes.
 * The credential is discarded: no identity token is stored or sent.
 */
export async function presentAppleSheet(): Promise<AppleSheetResult> {
  try {
    const available = await AppleAuthentication.isAvailableAsync();
    if (!available) return 'failed';
    await AppleAuthentication.signInAsync({ requestedScopes: [] });
    return 'ok';
  } catch (error) {
    if (cancelled(error)) return 'cancelled';
    return 'failed';
  }
}
