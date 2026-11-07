/**
 * Shared sheet motion. The 620pt distance in the proposal is one example
 * sheet (its own height). Every formula here takes the measured height.
 * Drag math is plain and worklet-safe so the UI thread and the tests share it.
 */

export const SHEET_OPEN_MS = 520;
export const SHEET_CLOSE_MS = 360;
export const SHEET_SWIPE_CLOSE_MS = 280;

/** iOS sheet curve. Soft landing, no overshoot. */
export const SHEET_OPEN_BEZIER = [0.32, 0.72, 0, 1] as const;
/** Ease-in cubic. The sheet is let go. */
export const SHEET_CLOSE_BEZIER = [0.32, 0, 0.67, 0] as const;
/** Starts with speed so a flick does not stop after the finger lifts. */
export const SHEET_SWIPE_CLOSE_BEZIER = [0.2, 0.6, 0.5, 1] as const;

/**
 * Critically damped. Matches SwiftUI spring(response: 0.55, dampingFraction: 1).
 * damping / (2 * sqrt(stiffness * mass)) = 1.
 */
export const SHEET_SPRING = { mass: 1, stiffness: 130.5, damping: 22.85 } as const;

/** Downward speed, in points per second, that closes even below the distance threshold. */
export const SHEET_DISMISS_VELOCITY = 800;
/** Fraction of the sheet height. Past this, a release closes. */
export const SHEET_DISMISS_FRACTION = 0.3;

/** Apple rubber-band coefficient. 80pt of finger on a 620pt sheet is about 41pt. */
export const SHEET_RUBBER_C = 0.55;

export const SHEET_BACKDROP_MAX = 0.4;
export const SHEET_BACKDROP = '#111110';

export const SHEET_GRABBER = '#ADA9A2';
export const SHEET_GRABBER_WIDTH = 36;
export const SHEET_GRABBER_HEIGHT = 5;
export const SHEET_GRABBER_TOP = 5;
/** Drag starts from the grabber or anywhere in this band at the top of the sheet. */
export const SHEET_DRAG_ZONE = 56;
export const SHEET_HIT_MIN = 44;
/**
 * Modal content starts this far from the sheet edge.
 * Same 24pt as the side margin. The drag band stays 56 so the grabber keeps a 44pt hit.
 */
export const SHEET_CONTENT_TOP = 24;

/** Negative margin that pulls sheet content up to `SHEET_CONTENT_TOP`. */
export function sheetContentPullUp(dragZone: number = SHEET_DRAG_ZONE, top: number = SHEET_CONTENT_TOP): number {
  return top - dragZone;
}

export const SHEET_REDUCE_IN_MS = 200;
export const SHEET_REDUCE_OUT_MS = 160;

export function rubberBandOffset(distance: number, limit: number, coefficient?: number): number {
  'worklet';
  // Worklets do not capture names used only in default parameters, so read it here.
  const rubber = coefficient ?? SHEET_RUBBER_C;
  if (distance <= 0 || limit <= 0) return 0;
  return (1 - 1 / ((distance * rubber) / limit + 1)) * limit;
}

/** Finger delta in points. Positive is down and tracks 1:1. Negative rubber-bands. */
export function fingerToTranslate(dy: number, limit: number): number {
  'worklet';
  if (dy >= 0) return dy;
  return -rubberBandOffset(-dy, limit);
}

/** Inverse of the rubber band, so a grab during the stretch continues smoothly. */
export function translateToFinger(translateY: number, limit: number): number {
  'worklet';
  if (translateY >= 0 || limit <= 0) return Math.max(0, translateY);
  const offset = Math.min(-translateY, limit * 0.999);
  const fraction = offset / limit;
  const distance = (limit / SHEET_RUBBER_C) * (1 / (1 - fraction) - 1);
  return -distance;
}

export function shouldDismissSheet(translateY: number, sheetHeight: number, velocityY: number): boolean {
  'worklet';
  if (velocityY > SHEET_DISMISS_VELOCITY) return true;
  if (sheetHeight <= 0) return false;
  return translateY > sheetHeight * SHEET_DISMISS_FRACTION;
}

/** Backdrop alpha for #111110. Rest is 0.4, fully offscreen is 0, stretch stays at 0.4. */
export function backdropOpacityForTranslate(translateY: number, travel: number): number {
  'worklet';
  if (travel <= 0) return translateY <= 0 ? SHEET_BACKDROP_MAX : 0;
  if (translateY <= 0) return SHEET_BACKDROP_MAX;
  if (translateY >= travel) return 0;
  return (1 - translateY / travel) * SHEET_BACKDROP_MAX;
}
