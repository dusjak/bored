/**
 * Logg v4 tally. Fifteen Klumper per row, three groups of five.
 * At the 345pt column: 15w + 12×(w/4) + 2w = 20w = 345, so w = 17.25.
 * Gap, group gap, and row gap keep the 4/16, 16/16, and 8/16 ratios.
 * The 1.4pt stroke stays fixed when a narrower column scales the shapes.
 * Filled = completed, outline = aborted. Same outer edge either way.
 */

export const KLUMP_GROUP = 5;
export const LOGG_GROUPS_PER_ROW = 3;
export const LOGG_PER_ROW = KLUMP_GROUP * LOGG_GROUPS_PER_ROW;
/** Closed tally shows two rows. Further sessions stay in the caption and the list. */
export const LOGG_COLLAPSED_MAX = LOGG_PER_ROW * 2;

export const KLUMP = {
  width: 17.25,
  stroke: 1.4,
  gap: 4.3125,
  groupGap: 17.25,
  rowGap: 8.625,
  /** Design column. Narrower screens scale width and gaps, not the stroke. */
  contentWidth: 345,
  /** Light-mode ink. Rendering uses the theme tally token. */
  ink: '#000000',
} as const;

export type LogMetrics = {
  width: number;
  gap: number;
  groupGap: number;
  rowGap: number;
  stroke: number;
};

/** Symbol size for a measured content width. 345pt and wider use the v4 sizes. */
export function logMetrics(contentWidth: number): LogMetrics {
  const scale = contentWidth > 0 && contentWidth < KLUMP.contentWidth ? contentWidth / KLUMP.contentWidth : 1;
  return {
    width: KLUMP.width * scale,
    gap: KLUMP.gap * scale,
    groupGap: KLUMP.groupGap * scale,
    rowGap: KLUMP.rowGap * scale,
    stroke: KLUMP.stroke,
  };
}

/**
 * Margins around the lump row, in pt.
 * Count line box → lumps is ~9 (the 56pt digit's line box already holds the descender).
 * Lumps → "N fullført, M avbrutt" is ~13. The notes then keep the 32pt header margin.
 */
export const LOG_KLUMP_SPACING = {
  aboveCount: 9,
  /** Symbols to caption when every symbol is already visible. */
  aboveSummary: 13,
  /** Symbols to the accordion, then accordion to the caption. */
  aboveToggle: 8,
  belowToggle: 5,
} as const;

export const LOGG_TOGGLE = {
  more: 'Vis alle',
  less: 'Vis færre',
  minHeight: 44,
} as const;

/**
 * Space between the Logg count and «økt» / «økter».
 * Was `space['3']` (12). Reduced by 4pt. Engineering choice, not a mandated measure.
 */
export const LOG_COUNT_WORD_GAP = 8;

/** Side-by-side note actions. Same 8pt gap as `space['2']`. Save is 2/3, delete is 1/3. */
export const LOG_NOTE_ACTION_GAP = 8;
export const LOG_SAVE_FLEX = 2;
export const LOG_DELETE_FLEX = 1;

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

/** Width of one full v4 row: three groups of five. */
export function logRowWidth(metrics: LogMetrics = logMetrics(KLUMP.contentWidth)): number {
  const group = KLUMP_GROUP * metrics.width + (KLUMP_GROUP - 1) * metrics.gap;
  return LOGG_GROUPS_PER_ROW * group + (LOGG_GROUPS_PER_ROW - 1) * metrics.groupGap;
}

/** How many symbols the tally draws. The caption still counts every session. */
export function visibleTallyCount(total: number, expanded: boolean): number {
  if (total <= LOGG_COLLAPSED_MAX) return Math.max(0, total);
  return expanded ? total : LOGG_COLLAPSED_MAX;
}

/** Newest first. Each row is up to three groups of five. */
export function logSymbolRows<T>(marks: readonly T[]): T[][][] {
  const groups = groupKlumper(marks, KLUMP_GROUP);
  const rows: T[][][] = [];
  for (let index = 0; index < groups.length; index += LOGG_GROUPS_PER_ROW) {
    rows.push(groups.slice(index, index + LOGG_GROUPS_PER_ROW));
  }
  return rows;
}

/**
 * Caption under the symbols. Counts every finished session, including those
 * hidden by the closed accordion. 1 is «økt»; every other total is «økter».
 */
export function logCaption(total: number, completed: number, aborted: number): string {
  const head = total === 1 ? '1 økt' : `${Math.max(0, total)} økter`;
  return `${head}: ${completed} fullført, ${aborted} avbrutt`;
}
