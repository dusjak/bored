/**
 * Gravert v2, Figtree 400, Gummi.
 * The design script measures in pixels at 3×. These are those values in points.
 * One place owns the treatment so a later inner-shadow pass can replace it.
 */
export const ENGRAVED_DIGIT_COLOR = '#F8F6F2';
export const ENGRAVED_FONT = 'Figtree_400Regular';

/** Reference centers were cy−11 and cy+25. Each moves 2 pt inward, so the gap shrinks by 4 pt and the pair stays centered. */
export const NUMBER_CENTER_FROM_CY = -9;
export const UNIT_CENTER_FROM_CY = 23;

export const ENGRAVE = {
  /** Mask soften. 0.6 px @3×. */
  soften: 0.6 / 3,
  /** Inner shadow, down-right. 4 px @3×, blur 1.2, strength 0.40. */
  innerShift: 4 / 3,
  innerBlur: 1.2 / 3,
  innerStrength: 0.4,
  /** Cut outside the upper-left, and the light edge on the lower-right. 3 px @3×. */
  edgeShift: 3 / 3,
  edgeBlur: 0.72 / 3,
  darkStrength: 0.5,
  lightStrength: 0.3 * 0.5,
} as const;

/** Kept for callers that still paint with a text shadow. The stone uses `ENGRAVE`. */
export const ENGRAVED_SHADOW = {
  textShadowColor: 'rgba(0, 0, 0, 0.55)',
  textShadowOffset: { width: 1, height: 1 },
  textShadowRadius: 1,
} as const;
