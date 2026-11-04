/**
 * Deg v2.2 measurements. The type roles stay on the semantic text tokens
 * so system F (Figtree + DM Serif Display) replaces the faces without a
 * second edit here. Sizes that the current roles do not match are applied
 * on top of the role.
 */

/** Track 52×31, knob 27, 2pt inset. Travel is 52 − 4 − 27 = 21. */
export const switchTrack = { width: 52, height: 31, radius: 15.5 } as const;
export const switchKnob = 27;
export const switchInset = 2;
export const switchTravel = switchTrack.width - switchInset * 2 - switchKnob;
/** Knob 200ms, iOS curve. Reduce Motion jumps the knob and still swaps color. */
export const switchDuration = 200;
export const switchBezier = [0.25, 0.1, 0.25, 1] as const;

export const deg = {
  groupRadius: 14,
  groupGap: 32,
  rowMinHeight: 50,
  rowInset: 16,
  separator: 0.5,
  footerGap: 7,
  /**
   * «Dusan» is DM Serif Display Italic 44.
   * The font's own line box is 44 × 1371/1000 = 60, so the ascender sits 34 pt
   * under the safe area and the first card is 24 pt under that line box.
   * The reference has no «Kjedet deg siden» line in this gap.
   */
  titleSize: 44,
  titleLine: 60,
  titleTop: 34,
  afterTitle: 24,
  rowSize: 17,
  rowLine: 22,
  resetGap: 30,
  resetMinHeight: 44,
  /** «1.0.0» on the 9:41 frame sits 18 pt under the Nullstill row, not 28. */
  versionGap: 18,
  /** Figtree’s caps sit high in the 22 pt line. Nudge labels down onto the row centre. */
  rowTextShift: 2,
  wheelHeight: 216,
  wheelRow: 34,
  wheelInset: 8,
  /** One row per minute, 00–59, same as the iOS alarm picker. */
  wheelMinuteStep: 1,
  /** Height animation. cubic-bezier(0.32, 0.72, 0, 1). Reduce Motion crossfades. */
  wheelDuration: 300,
  wheelBezier: [0.32, 0.72, 0, 1] as const,
  /** Content fades toward the tab bar. */
  fadeHeight: 150,
  chevronWidth: 8,
  chevronHeight: 13,
  chevronStroke: 2,
  capsuleHeight: 31,
} as const;

export const WHEEL_HOURS = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0'));
export const WHEEL_MINUTES = Array.from({ length: 60 / deg.wheelMinuteStep }, (_, index) =>
  String(index * deg.wheelMinuteStep).padStart(2, '0'),
);

export function wheelIndex(values: readonly string[], selected: string): number {
  const index = values.indexOf(selected);
  return index < 0 ? 0 : index;
}

/** Snap a scroll offset to a row. Stays inside the list. */
export function indexFromOffset(offset: number, count: number, row = deg.wheelRow): number {
  if (count <= 0) return 0;
  const index = Math.round(offset / row);
  return Math.max(0, Math.min(count - 1, index));
}
