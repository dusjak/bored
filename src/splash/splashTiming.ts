/**
 * Splash timings with no worklets, so the launch path can import this file
 * without evaluating the Sluket timeline.
 * The plate is always dark. A crash holds until the v4 rest frame, at least 300 ms.
 */
export const SPLASH_BG = '#111110';
export const SPLASH_INK = '#F8F6F2';
/** Dråpe when the calm splash is not playing (kill switch, and the old still hold). */
export const STILL_HOLD_MS = 300;
/** Dråpe while Reduce Motion is on. */
export const REDUCE_HOLD_MS = 600;
/**
 * Overlay opacity 1 → 0 when the app under the plate is dark.
 * cubic-bezier(0.4, 0, 1, 1). A light app cuts instead, so the blend is not grey.
 */
export const EXIT_FADE_MS = 200;
export const REDUCE_FADE_MS = EXIT_FADE_MS;
export const EXIT_FADE_BEZIER = [0.4, 0, 1, 1] as const;
/** D2 Pust motion, back on the rest frame. The dark fade, when it runs, is the next 200 ms. */
export const PUST_MOTION_MS = 700;
export const PUST_MS = PUST_MOTION_MS + EXIT_FADE_MS;
/**
 * Rest frame of MegaSplash on the display clock.
 * 150 ms wordmark exit, then the v5 preset C rest frame at 3000 ms.
 * A crash holds whatever is left of that, at least 300 ms.
 */
export const CRASH_REST_AT = 3150;
export const CRASH_HOLD_MIN_MS = 300;
/**
 * Pust plays on a return from background only after this long away.
 * A shorter return still puts the wordmark in the iOS snapshot, then leaves
 * (cut or 200 ms fade) without the breathe and without the Reduce Motion hold.
 * Control Center and notification shade are `inactive` and never start this.
 * Open question for Dusan: 60 seconds.
 */
export const BACKGROUND_RETURN_MIN_MS = 60_000;

export function exitFadeMs(darkTheme: boolean): number {
  return darkTheme ? EXIT_FADE_MS : 0;
}

export function crashHoldMs(elapsedMs: number): number {
  const remaining = CRASH_REST_AT - Math.max(0, elapsedMs);
  return Math.max(CRASH_HOLD_MIN_MS, remaining);
}
