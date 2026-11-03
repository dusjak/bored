/**
 * Log lumps. One Klumpen per finished session, groups of five.
 * Filled = completed, outline = aborted. Same outer edge either way.
 *
 * Spacing is measured on dusan-logg-klumper-2026-11-04.png (393×852 at 2×):
 * the row is 16pt-wide lumps, 4pt apart, 16pt between groups.
 * Fourteen lumps (5 + 5 + 4) are 300pt wide and end at the content edge.
 */

export const KLUMP_GROUP = 5;

export const KLUMP = {
  width: 16,
  stroke: 1.4,
  gap: 4,
  groupGap: 16,
  /** Wrapped rows. The comp is a single row. */
  rowGap: 8,
  /** Light-mode ink. The comp is pure black, not text.primary. */
  ink: '#000000',
} as const;

/**
 * Margins around the lump row, in pt.
 * Count line box → lumps is ~9 (the 56pt digit's line box already holds the descender).
 * Lumps → "N fullført, M avbrutt" is ~13. The notes then keep the 32pt header margin.
 */
export const LOG_KLUMP_SPACING = {
  aboveCount: 9,
  aboveSummary: 13,
} as const;

/** Curve bounds of `KLUMPEN_PATH`, sampled so the stroke can stay 1.4pt at any size. */
export const KLUMPEN_CURVE = {
  minX: 0,
  minY: 77.23267639160157,
  maxX: 999.99896484375,
  maxY: 922.7630215454102,
} as const;

export type KlumpFrame = {
  width: number;
  height: number;
  strokeWidth: number;
  viewBox: string;
};

/**
 * Frame whose outer edge is `outerWidth` pt wide, with a `strokePt` stroke
 * that is not scaled down with the shape.
 */
export function klumpenFrame(outerWidth: number, strokePt: number): KlumpFrame {
  const curveW = KLUMPEN_CURVE.maxX - KLUMPEN_CURVE.minX;
  const curveH = KLUMPEN_CURVE.maxY - KLUMPEN_CURVE.minY;
  const outerUserW = curveW / (1 - strokePt / outerWidth);
  const strokeUser = outerUserW - curveW;
  const outerUserH = curveH + strokeUser;
  const height = outerWidth * (outerUserH / outerUserW);
  const minX = KLUMPEN_CURVE.minX - strokeUser / 2;
  const minY = KLUMPEN_CURVE.minY - strokeUser / 2;
  return {
    width: outerWidth,
    height,
    strokeWidth: strokeUser,
    viewBox: `${minX} ${minY} ${outerUserW} ${outerUserH}`,
  };
}

export function groupKlumper<T>(marks: readonly T[], size: number = KLUMP_GROUP): T[][] {
  const groups: T[][] = [];
  for (let index = 0; index < marks.length; index += size) {
    groups.push(marks.slice(index, index + size));
  }
  return groups;
}

/** Width of a single row of `count` lumps, including the gaps between groups. */
export function klumpRowWidth(count: number): number {
  if (count <= 0) return 0;
  const groups = Math.ceil(count / KLUMP_GROUP);
  const innerGaps = count - groups;
  return count * KLUMP.width + innerGaps * KLUMP.gap + (groups - 1) * KLUMP.groupGap;
}
