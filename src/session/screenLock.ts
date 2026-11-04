import { requireOptionalNativeModule } from 'expo';

import { bindScreenLock, type ScreenLockNative } from '@/session/screenLockApi';

/**
 * Loads the iOS screen-lock module when the binary has it.
 * Expo Go does not include the module: `requireOptionalNativeModule` returns null
 * and the hint still runs. A throw here would take down the session screen, so
 * the load is caught and treated as "not available".
 */
function loadScreenLock(): ScreenLockNative | null {
  try {
    return requireOptionalNativeModule<ScreenLockNative>('ScreenLock');
  } catch {
    return null;
  }
}

export const screenLock = bindScreenLock(loadScreenLock());
