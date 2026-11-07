export type LockHintOffer = 'hidden' | 'text' | 'bulge';

/** Hold-to-end moments. The lock hint stays hidden for all three. */
export type HoldHintMoment = 'idle' | 'start' | 'cancel' | 'complete';

export type HoldHintGate = {
  moment: HoldHintMoment;
  /** Early release may show the hint again at this clock. Null otherwise. */
  reopenAt: number | null;
};

export const HOLD_HINT_IDLE: HoldHintGate = { moment: 'idle', reopenAt: null };

export function lockHintOfferWhileHolding(offer: LockHintOffer, moment: HoldHintMoment): LockHintOffer {
  if (moment === 'idle') return offer;
  return 'hidden';
}

/** One gate for start, early release, and completion. Session and LockHint both use it. */
export function holdHintGateFor(event: 'start' | 'cancel' | 'complete', now: number, exitMs: number): HoldHintGate {
  if (event === 'start') return { moment: 'start', reopenAt: null };
  if (event === 'complete') return { moment: 'complete', reopenAt: null };
  return { moment: 'cancel', reopenAt: now + exitMs };
}

/** Cancel becomes idle once its own exit window has passed. Start and complete stay. */
export function holdHintMomentAt(gate: HoldHintGate, now: number): HoldHintMoment {
  if (gate.moment === 'cancel' && gate.reopenAt != null && now >= gate.reopenAt) return 'idle';
  return gate.moment;
}

/**
 * A cancel timer must not reopen the hint if a later start or completion
 * replaced that scheduled instant.
 */
export function applyHoldHintTimeout(current: HoldHintGate, scheduledReopenAt: number, now: number): HoldHintGate {
  if (current.moment !== 'cancel' || current.reopenAt !== scheduledReopenAt) return current;
  if (now < scheduledReopenAt) return current;
  return HOLD_HINT_IDLE;
}

/** The frame LockHint actually paints. Hidden unless the offer and the hold gate both allow it. */
export function lockHintFrameVisible(input: { live: boolean; offer: LockHintOffer; moment: HoldHintMoment }): boolean {
  if (!input.live) return false;
  return lockHintOfferWhileHolding(input.offer, input.moment) !== 'hidden';
}

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
