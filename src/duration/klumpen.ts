import { PRESET_MINUTES, minutesPhrase } from '../data/copy.ts';

/**
 * Duration sheet, direction C.
 * The Klumpen width is `120 + 40·index` pt. Index 0–3 is 5/10/15/20 minutes.
 * Height follows the silhouette (≈0.846·width), which rounds to 101/135/169/203.
 */

export const DURATION_TITLE = 'Velg varighet';
export const DURATION_SUBTITLE = 'Hvor lang tid har du i dag?';
export const DURATION_HOME_HINT = 'Trykk for å velge en annen tid';
export const DURATION_ADJUST_LABEL = 'Varighet';
export const DURATION_ADJUST_HINT = 'Sveip opp eller ned for å endre';
export const DURATION_UNIT = 'min';

/** Silhouette box of `KLUMPEN_PATH`, in path units. */
export const KLUMPEN_BOUNDS = { x: 0, y: 77.233, width: 1000, height: 845.53 } as const;
export const KLUMP_ASPECT = KLUMPEN_BOUNDS.height / KLUMPEN_BOUNDS.width;

export const KLUMP_WIDTH_MIN = 120;
export const KLUMP_WIDTH_STEP = 40;
export const LAST_INDEX = PRESET_MINUTES.length - 1;

export const SWIPE_STEP = 64;
export const SWIPE_ACTIVATION = 8;
export const VERTICAL_YIELD = 10;
export const FLICK_VELOCITY = 600;

/** iOS rubber-band coefficient. The asymptote is `RUBBER_LIMIT` index units (±15 pt). */
export const RUBBER_C = 0.55;
export const RUBBER_LIMIT = 0.375;

/** Critically damped. ζ = damping / (2·√(stiffness·mass)) = 1. */
export const SIZE_SPRING = { mass: 1, stiffness: 240, damping: 31 } as const;

/** Home starts this spring after «Bruk», while the sheet is leaving. */
export const HOME_APPLY_DELAY = 120;

export const FILL_MS = 160;
export const CROSSFADE_MS = 160;
export const ROLL_OUT_MS = 120;
export const ROLL_IN_MS = 200;
export const ROLL_IN_DELAY = 60;
export const ROLL_DISTANCE = 6;

export const ROW_WIDTHS = [22, 28, 34, 40] as const;
export const ROW_PITCH = 79;
/** Each choice is a button. 72 pt covers the lump; the label sits in the same target, and 44 pt is the floor. */
export const ROW_HIT = 72;
export const CHOICE_HIT_MIN = 44;
export const ROW_STROKE = 1.4;
/** Ink-to-ink gap between the hero numeral and «min» on Hjem, in points. */
export const NUMBER_UNIT_GAP = 4;
/**
 * Figtree OS/2 typo metrics. `useTypoMetrics` is on. unitsPerEm is 1000.
 * The lowest ink of 0–9 is −12. The dot of «i» in «min» reaches 721.
 */
export const FIGTREE_UPM = 1000;
export const FIGTREE_TYPO_ASCENDER = 950;
export const FIGTREE_TYPO_DESCENDER = -250;
export const FIGTREE_DIGIT_YMIN = -12;
export const FIGTREE_MIN_YMAX = 721;
export const HOME_UNIT_FONT_SIZE = 13;
export const HOME_UNIT_LINE_HEIGHT = 16;

/**
 * Empty points under the numeral inside the hero line.
 * The line is `numberSize` tall and shorter than the 1.2em typo box, so iOS
 * keeps the descender side and clips the top. The baseline therefore sits
 * 250/1000 em above the bottom of that line.
 */
export function homeNumberSlackBelow(numberSize: number): number {
  return (numberSize * (Math.abs(FIGTREE_TYPO_DESCENDER) + FIGTREE_DIGIT_YMIN)) / FIGTREE_UPM;
}

/** Empty points above the «i» dot inside the «min» line. */
export function homeUnitSlackAbove(unitSize = HOME_UNIT_FONT_SIZE, lineHeight = HOME_UNIT_LINE_HEIGHT): number {
  const fontLine = (unitSize * (FIGTREE_TYPO_ASCENDER - FIGTREE_TYPO_DESCENDER)) / FIGTREE_UPM;
  const baselineOffset = lineHeight >= fontLine ? (lineHeight - fontLine) / 2 : 0;
  const aboveDot = (unitSize * (FIGTREE_TYPO_ASCENDER - FIGTREE_MIN_YMAX)) / FIGTREE_UPM;
  return baselineOffset + aboveDot;
}

/**
 * `marginTop` on «min» so the ink gap is `gap` points.
 * A plain margin of 4 leaves the line-box slack in place.
 */
export function homeUnitMarginTop(numberSize: number, gap = NUMBER_UNIT_GAP): number {
  return gap - homeNumberSlackBelow(numberSize) - homeUnitSlackAbove();
}
/**
 * Duration sheet only. About 4pt tighter than Hjem.
 * 4 − 4 = 0. Hjem keeps `NUMBER_UNIT_GAP`.
 */
export const SHEET_NUMBER_UNIT_GAP = NUMBER_UNIT_GAP - 4;

/**
 * Breathing-room sheet on the 852 pt frame.
 * Title baseline 72 pt under the sheet edge, subtitle baseline 28 pt under that,
 * 48 pt from the subtitle baseline to the 240 pt outline, 40 pt from that outline
 * to the small lumps, number baselines 26 pt under the shared lump bottom,
 * 40 pt from the numbers to «Bruk». «Bruk» is 56 pt with 42 pt under it.
 */
export const SHEET_TOP = 220;
export const TITLE_BASELINE = 72;
export const SUBTITLE_BASELINE_GAP = 28;
export const SUBTITLE_TO_OUTLINE = 48;
export const OUTLINE_TO_LUMPS = 40;
export const NUMBER_BASELINE_GAP = 26;
export const NUMBERS_TO_BUTTON = 40;
export const BUTTON_HEIGHT = 56;

const TITLE_LINE = 32;
const TITLE_BASELINE_IN_LINE = 26;
const SUBTITLE_LINE = 24;
const SUBTITLE_BASELINE_IN_LINE = 18;
const NUMBER_LINE = 22;
const NUMBER_BASELINE_IN_LINE = 17;
const GRABBER_BLOCK = 10;

export function durationSheetLayout(outlineHeight: number, lumpHeight: number) {
  const titleMargin = TITLE_BASELINE - GRABBER_BLOCK - TITLE_BASELINE_IN_LINE;
  const subtitleMargin =
    SUBTITLE_BASELINE_GAP - (TITLE_LINE - TITLE_BASELINE_IN_LINE) - SUBTITLE_BASELINE_IN_LINE;
  const stoneMargin = SUBTITLE_TO_OUTLINE - (SUBTITLE_LINE - SUBTITLE_BASELINE_IN_LINE);
  const rowMargin = OUTLINE_TO_LUMPS - (ROW_HIT - lumpHeight);
  const labelMargin = NUMBER_BASELINE_GAP - NUMBER_BASELINE_IN_LINE;
  const aboveButton =
    GRABBER_BLOCK +
    titleMargin +
    TITLE_LINE +
    subtitleMargin +
    SUBTITLE_LINE +
    stoneMargin +
    outlineHeight +
    rowMargin +
    ROW_HIT +
    labelMargin +
    NUMBER_LINE;
  // The listed 40 pt under the numbers, plus whatever is left so the sheet
  // opens at y 220 while «Bruk» stays 56 pt tall and 42 pt above the screen.
  const footerMargin = Math.max(NUMBERS_TO_BUTTON, 852 - SHEET_TOP - aboveButton - BUTTON_HEIGHT - 42);
  const sheetHeight = aboveButton + footerMargin + BUTTON_HEIGHT + 42;
  return {
    titleMargin,
    subtitleMargin,
    stoneMargin,
    rowMargin,
    labelMargin,
    footerMargin,
    sheetHeight,
    sheetTop: 852 - sheetHeight,
  };
}

export const SHEET_RADIUS = 38;
export const GRABBER_WIDTH = 36;
export const GRABBER_HEIGHT = 5;
export const GRABBER_COLOR = '#ADA9A2';
export const OUTLINE_COLOR = '#CFC9BF';
export const OUTLINE_WIDTH = 1;
export const STONE_COLOR = '#111110';
export const STONE_NUMBER_COLOR = '#F8F6F2';
export const STONE_UNIT_COLOR = '#ADA9A2';

/**
 * Lump centroid on the 393×852 reference. B2, B3 and B4 share this line.
 * A taller title must not move it. Other window heights scale the same fraction.
 */
export const STONE_CENTER_ON_852 = 435;

export function stoneCenterY(windowHeight: number): number {
  return (windowHeight * STONE_CENTER_ON_852) / 852;
}

/** Stone center on the reference 393×852 frame. */
export const SHEET_STONE_CENTER_Y = 484;
export const HOME_STONE_CENTER_Y = stoneCenterY(852);
export const HINT_GAP = 28;

/** Body text scale where iOS reaches AX1 (28/17). */
export const AX1_FONT_SCALE = 28 / 17;

const LARGE_TITLE_STOPS: readonly (readonly [number, number])[] = [
  [14 / 17, 31 / 34],
  [15 / 17, 32 / 34],
  [16 / 17, 33 / 34],
  [1, 1],
  [19 / 17, 36 / 34],
  [21 / 17, 38 / 34],
  [23 / 17, 40 / 34],
  [AX1_FONT_SCALE, 1.25],
];

export function clampIndex(index: number): number {
  if (!(index > 0)) return 0;
  if (index > LAST_INDEX) return LAST_INDEX;
  return index;
}

export function klumpWidth(index: number): number {
  return KLUMP_WIDTH_MIN + KLUMP_WIDTH_STEP * index;
}

export function klumpHeight(width: number): number {
  return width * KLUMP_ASPECT;
}

/**
 * Row glyph box. The stroke is centred on the silhouette, so half of it
 * sits outside the path bounds and was clipped by the viewBox.
 * Pixel size grows by the stroke; the silhouette stays the same size.
 */
export function glyphFrame(
  width: number,
  strokeWidth: number,
  bounds: { x: number; y: number; width: number; height: number } = KLUMPEN_BOUNDS,
): { width: number; height: number; viewBox: string } {
  const safeWidth = width > 0 ? width : 1;
  const height = safeWidth * (bounds.height / bounds.width);
  const stroke = strokeWidth > 0 ? strokeWidth : 0;
  const strokeUnits = stroke * (bounds.width / safeWidth);
  const pad = strokeUnits / 2;
  return {
    width: safeWidth + stroke,
    height: height + stroke,
    viewBox: `${bounds.x - pad} ${bounds.y - pad} ${bounds.width + strokeUnits} ${bounds.height + strokeUnits}`,
  };
}

/** Continuous index for a stored length. Presets land on 0, 1, 2, 3. */
export function minutesToIndex(minutes: number): number {
  if (!Number.isFinite(minutes)) return 1;
  const raw = (minutes - PRESET_MINUTES[0]) / (PRESET_MINUTES[1] - PRESET_MINUTES[0]);
  return Math.min(LAST_INDEX, Math.max(0, raw));
}

/** Sheet opens on Hjem's value. Anything off the four stops snaps to the nearest. */
export function presetIndex(minutes: number): number {
  if (!Number.isFinite(minutes)) return 1;
  const exact = (PRESET_MINUTES as readonly number[]).indexOf(minutes);
  if (exact >= 0) return exact;
  return clampIndex(Math.round(minutesToIndex(minutes)));
}

function rubber(over: number): number {
  if (over <= 0) return 0;
  return (1 - 1 / ((over * RUBBER_C) / RUBBER_LIMIT + 1)) * RUBBER_LIMIT;
}

/** iOS rubber band. The width stays inside about 105–255 pt. */
export function rubberBandIndex(index: number): number {
  if (index < 0) return -rubber(-index);
  if (index > LAST_INDEX) return LAST_INDEX + rubber(index - LAST_INDEX);
  return index;
}

export function indexFromSwipe(startIndex: number, dx: number): number {
  return rubberBandIndex(startIndex + dx / SWIPE_STEP);
}

/**
 * Lock the stone drag. Vertical is either direction.
 * The sheet's own dismiss stays outside this responder.
 */
export function stonePanAxis(dx: number, dy: number, current: 'x' | 'y' | null): 'x' | 'y' | null {
  if (current != null) return current;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  if (absY > VERTICAL_YIELD && absY > absX) return 'y';
  if (absX > SWIPE_ACTIVATION && absX > absY) return 'x';
  return null;
}

/** Up (negative dy) moves toward a longer preset. Same 64 pt step as the horizontal drag. */
export function verticalStoneIndex(startIndex: number, dy: number): number {
  return indexFromSwipe(startIndex, -dy);
}

/**
 * Release on the stone selects a preset. It never dismisses the sheet.
 * Vertical ignores flick velocity. Horizontal keeps the existing flick.
 */
export function stoneReleaseAction(input: {
  axis: 'x' | 'y' | null;
  startIndex: number;
  dx: number;
  dy: number;
  vx: number;
}): { kind: 'none' } | { kind: 'select'; index: number } {
  if (input.axis === 'y') {
    return { kind: 'select', index: snapIndex(verticalStoneIndex(input.startIndex, input.dy), 0) };
  }
  if (input.axis === 'x') {
    return { kind: 'select', index: snapIndex(indexFromSwipe(input.startIndex, input.dx), input.vx) };
  }
  return { kind: 'none' };
}

export function selectionFromIndex(index: number): number {
  return clampIndex(Math.round(index));
}

/**
 * Snap to the nearest stop.
 * A flick faster than 600 pt/s moves one stop in that direction,
 * and does not add a second stop when rounding has already arrived there.
 */
export function snapIndex(index: number, velocityX: number): number {
  const nearest = selectionFromIndex(index);
  if (!(Math.abs(velocityX) > FLICK_VELOCITY)) return nearest;
  const dir = velocityX > 0 ? 1 : -1;
  const base = dir > 0 ? Math.floor(index) : Math.ceil(index);
  if (Math.round(index) !== base) return nearest;
  return clampIndex(base + dir);
}

export function indexVelocity(pxPerSecond: number): number {
  return pxPerSecond / SWIPE_STEP;
}

/** Over-crossfade weights. At u = 0.5 both are 0.875 and coverage stays ≥ 98%. */
export function overWeights(u: number): { previous: number; next: number } {
  const t = Math.min(1, Math.max(0, u));
  return { previous: 1 - t * t * t, next: 1 - (1 - t) * (1 - t) * (1 - t) };
}

export function overCoverage(u: number): number {
  const { previous, next } = overWeights(u);
  return 1 - (1 - previous) * (1 - next);
}

/**
 * Sign of the outgoing digit's vertical move.
 * A larger value rolls upward (−1). A smaller value rolls downward (+1).
 */
export function rollTravel(from: number, to: number): -1 | 0 | 1 {
  if (to > from) return -1;
  if (to < from) return 1;
  return 0;
}

export type DurationType = {
  numberScale: number;
  hideUnit: boolean;
  verticalChoices: boolean;
};

/**
 * The number follows Large Title up to AX1, and never past 56 × 1.25.
 * Above AX1 the unit hides. From AX1 the four choices stack vertically.
 */
export function durationType(fontScale: number): DurationType {
  const scale = Number.isFinite(fontScale) && fontScale > 0 ? fontScale : 1;
  const verticalChoices = scale >= AX1_FONT_SCALE - 0.02;
  const hideUnit = scale > AX1_FONT_SCALE + 0.08;
  let numberScale = 1.25;
  const first = LARGE_TITLE_STOPS[0];
  const last = LARGE_TITLE_STOPS[LARGE_TITLE_STOPS.length - 1];
  if (first && scale <= first[0]) numberScale = first[1];
  else if (last && scale >= last[0]) numberScale = last[1];
  else {
    for (let i = 0; i < LARGE_TITLE_STOPS.length - 1; i += 1) {
      const a = LARGE_TITLE_STOPS[i];
      const b = LARGE_TITLE_STOPS[i + 1];
      if (!a || !b) break;
      if (scale <= b[0]) {
        const u = (scale - a[0]) / (b[0] - a[0]);
        numberScale = a[1] + (b[1] - a[1]) * u;
        break;
      }
    }
  }
  return { numberScale: Math.min(numberScale, 1.25), hideUnit, verticalChoices };
}

export function durationValueText(minutes: number): string {
  return minutesPhrase(minutes);
}

export function useButtonLabel(minutes: number): string {
  return `Bruk ${minutesPhrase(minutes)}`;
}

export function homeKlumpenLabel(minutes: number): string {
  return minutesPhrase(minutes);
}

export function chosenAnnouncement(minutes: number): string {
  return `${minutesPhrase(minutes)} valgt`;
}

export function sheetBottomPadding(insetBottom: number): number {
  return Math.max(insetBottom, 34) + 8;
}

/** Pitch of the four choices. 79 pt on a 393 pt phone; narrower phones pull in so the hits still fit. */
export function rowPitch(screenWidth: number): number {
  const fit = Math.floor((screenWidth - 16) / PRESET_MINUTES.length);
  return Math.min(ROW_PITCH, Math.max(ROW_HIT, fit));
}

export function rowCenters(screenWidth: number): number[] {
  const pitch = rowPitch(screenWidth);
  const rowWidth = pitch * PRESET_MINUTES.length;
  const left = (screenWidth - rowWidth) / 2;
  return PRESET_MINUTES.map((_, index) => left + pitch * index + pitch / 2);
}

export function dampingRatio(spring: { mass: number; stiffness: number; damping: number }): number {
  return spring.damping / (2 * Math.sqrt(spring.stiffness * spring.mass));
}
