/**
 * Splash timings with no worklets, so the launch path can import this file
 * without evaluating the Sluket timeline.
 */
export const STILL_HOLD_MS = 300;
export const REDUCE_HOLD_MS = 600;
export const REDUCE_FADE_MS = 200;
/** Rest frame of Sluket. A crash fallback holds whatever is left of this, at least 300 ms. */
export const CRASH_REST_AT = 1850;
export const CRASH_HOLD_MIN_MS = 300;

export function crashHoldMs(elapsedMs: number): number {
  const remaining = CRASH_REST_AT - Math.max(0, elapsedMs);
  return Math.max(CRASH_HOLD_MIN_MS, remaining);
}
