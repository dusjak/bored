export type LockHintOffer = 'hidden' | 'text' | 'bulge';

/**
 * The hint is one per fresh session, on a phone, portrait, and full screen.
 * Landscape, iPad, Stage Manager, and split view stay on the plain session.
 * An unmeasured phone still gets the text; the bulge needs a known button.
 */
export function lockHintOffer(input: {
  fresh: boolean;
  phone: boolean;
  portrait: boolean;
  fullscreen: boolean;
  centerY: number | null;
}): LockHintOffer {
  if (!input.fresh || !input.phone || !input.portrait || !input.fullscreen) return 'hidden';
  return input.centerY == null ? 'text' : 'bulge';
}

/** A window inset past this is split view or a floating window, not the full phone. */
export const LOCK_HINT_FULLSCREEN_SLOP_PT = 24;

export function isFullscreenWindow(
  windowWidth: number,
  windowHeight: number,
  screenWidth: number,
  screenHeight: number,
): boolean {
  return (
    Math.abs(screenWidth - windowWidth) <= LOCK_HINT_FULLSCREEN_SLOP_PT &&
    Math.abs(screenHeight - windowHeight) <= LOCK_HINT_FULLSCREEN_SLOP_PT
  );
}
