import { HOLD, RING_OFFSET } from './holdToEnd.ts';
import {
  KLUMPEN_BOUNDS,
  klumpenPoints,
  outlineBounds,
  sessionStoneScale,
  sessionStoneWidth,
} from './klumpenShape.ts';

/**
 * Gap from the timer line box to the outer edge of the track stroke, and from
 * that edge down to «Hold for å avslutte». Same at 120 / 160 / 200 / 240 pt.
 * The stroke is the 2.5 pt track (BOR-38), centred on the ring path.
 */
export const SESSION_RING_GAP = 32;

/** `text.monoTimer` line box. The spoken «gjenstår» is not drawn. */
export const SESSION_TIMER_BOX = 96;

/** `text.caption` line box for the hold hint. */
export const SESSION_HINT_BOX = 18;

/** iPhone 15 Pro and iPhone SE / 8, portrait, including the safe areas. */
export const SESSION_LAYOUT_SCREENS = [
  { width: 393, height: 852, safeTop: 59, safeBottom: 34 },
  { width: 375, height: 667, safeTop: 20, safeBottom: 0 },
] as const;

export type SessionScreen = {
  width: number;
  height: number;
  safeTop: number;
  safeBottom: number;
};

const restRing = klumpenPoints(0, 0, 0, 0, RING_OFFSET);
const RING_BOUNDS = outlineBounds(restRing.xs, restRing.ys);

export type RingReach = {
  /** Outer edge of the track stroke above the centroid, in pt. */
  top: number;
  /** Outer edge of the track stroke below the centroid, in pt. */
  bottom: number;
  width: number;
  height: number;
};

/** Rest outline. Pressing the stone flattens it, so this is the tallest ring. */
export function sessionRingReach(minutes: number): RingReach {
  const scale = sessionStoneScale(minutes);
  const half = HOLD.trackW / 2;
  const top = RING_BOUNDS.maxY * scale + half;
  const bottom = -RING_BOUNDS.minY * scale + half;
  const left = -RING_BOUNDS.minX * scale + half;
  const right = RING_BOUNDS.maxX * scale + half;
  return { top, bottom, width: left + right, height: top + bottom };
}

export type SessionColumn = {
  timerTop: number;
  timerBottom: number;
  ringTop: number;
  ringBottom: number;
  hintTop: number;
  hintBottom: number;
  gapAbove: number;
  gapBelow: number;
};

/**
 * Screen-y of the centred column inside the safe area.
 * `timer` is false when the countdown is hidden: the ring and the hint still
 * keep `SESSION_RING_GAP` between them, and the pair is centred.
 */
export function sessionColumn(minutes: number, screen: SessionScreen, timer: boolean): SessionColumn {
  const reach = sessionRingReach(minutes);
  const gapAbove = timer ? SESSION_RING_GAP : 0;
  const gapBelow = SESSION_RING_GAP;
  const timerBox = timer ? SESSION_TIMER_BOX : 0;
  const stack = timerBox + gapAbove + reach.height + gapBelow + SESSION_HINT_BOX;
  const content = screen.height - screen.safeTop - screen.safeBottom;
  const origin = screen.safeTop + (content - stack) / 2;
  const timerTop = origin;
  const timerBottom = timerTop + timerBox;
  const ringTop = timerBottom + gapAbove;
  const ringBottom = ringTop + reach.height;
  const hintTop = ringBottom + gapBelow;
  const hintBottom = hintTop + SESSION_HINT_BOX;
  return { timerTop, timerBottom, ringTop, ringBottom, hintTop, hintBottom, gapAbove, gapBelow };
}

/**
 * The canvas is the 240 pt stone plus glow, with the centroid at its centre.
 * Margins pull the layout box in so the previous sibling meets the ring, and
 * the hint meets the ring, instead of the canvas edge.
 */
export function sessionKlumpenMargins(
  minutes: number,
  canvasCenterY: number,
  gapAbove: number,
): { marginTop: number; hintMarginTop: number } {
  const reach = sessionRingReach(minutes);
  return {
    marginTop: gapAbove - (canvasCenterY - reach.top),
    hintMarginTop: SESSION_RING_GAP - (canvasCenterY - reach.bottom),
  };
}

/** Canvas for the largest stone. The centroid is the centre. */
export function sessionCanvasBox(): { width: number; height: number; cx: number; cy: number } {
  const reachX = Math.max(-KLUMPEN_BOUNDS.minX, KLUMPEN_BOUNDS.maxX) + RING_OFFSET;
  const reachY = Math.max(-KLUMPEN_BOUNDS.minY, KLUMPEN_BOUNDS.maxY) + RING_OFFSET;
  const scale = sessionStoneWidth(20) / KLUMPEN_BOUNDS.width;
  const pad = HOLD.glowRPeak + 16;
  const width = Math.ceil((reachX * scale + pad) * 2);
  const height = Math.ceil((reachY * scale + pad) * 2);
  return { width, height, cx: width / 2, cy: height / 2 };
}
