/**
 * Splash timings with no worklets, so the launch path can import this file
 * without evaluating the Sluket timeline.
 * The plate is always dark. A crash holds until the v4 rest frame, at least 300 ms.
 */
export const SPLASH_BG = '#111110';
export const SPLASH_INK = '#F8F6F2';
export const STILL_HOLD_MS = 300;
export const REDUCE_HOLD_MS = 600;
export const REDUCE_FADE_MS = 200;
/** Rest frame of Sluket v5 preset C (3000 ms). A crash fallback holds whatever is left of this, at least 300 ms. */
export const CRASH_REST_AT = 3000;
export const CRASH_HOLD_MIN_MS = 300;

export function crashHoldMs(elapsedMs: number): number {
  const remaining = CRASH_REST_AT - Math.max(0, elapsedMs);
  return Math.max(CRASH_HOLD_MIN_MS, remaining);
}
