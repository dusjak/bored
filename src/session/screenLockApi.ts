/**
 * JS half of the screen-lock detector.
 * The native module is absent in Expo Go. Callers must tolerate `available: false`
 * and a listener that never fires. Nothing here throws.
 */

export const SCREEN_LOCK_EVENT = 'onProtectedDataWillBecomeUnavailable';

export type ScreenLockSubscription = { remove: () => void };

export type ScreenLockNative = {
  addListener: (event: string, listener: () => void) => ScreenLockSubscription;
};

export type ScreenLock = {
  /** True only when the iOS module is linked. False in Expo Go and on Android. */
  available: boolean;
  addLockListener: (listener: () => void) => ScreenLockSubscription;
};

const noopSubscription: ScreenLockSubscription = { remove() {} };

export function bindScreenLock(native: ScreenLockNative | null | undefined): ScreenLock {
  if (!native || typeof native.addListener !== 'function') {
    return { available: false, addLockListener: () => noopSubscription };
  }
  return {
    available: true,
    addLockListener(listener) {
      try {
        const subscription = native.addListener(SCREEN_LOCK_EVENT, listener);
        if (!subscription || typeof subscription.remove !== 'function') return noopSubscription;
        return subscription;
      } catch {
        return noopSubscription;
      }
    },
  };
}
