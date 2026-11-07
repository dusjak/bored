import { KLUMPEN_PATH } from '../components/klumpenPath.ts';
import type { KlumpMaterialId } from '../data/types.ts';

/**
 * Edge drag for Form klumpen.
 * Thresholds, gains and limits are the part-1 material table.
 * Gummi's sector is the stated 40°. Stein uses its 0.014w facet, not 40°.
 * Plast and Fløyel are only described as broader than that 40°, so they use twice the stated angle.
 * Kull has no other sector. Its stated difference is inward 0.55 and outward 0.25.
 */

export const FORM_BINS = 48;
/** The only sector the source names, in degrees. Gummi. */
export const GUMMI_SECTOR_DEG = 40;
/**
 * Plast is «bredere påvirkning» and Fløyel is «en bred sektor».
 * The source gives no second angle, so both are twice Gummi's 40°.
 */
export const BROAD_SECTOR_DEG = GUMMI_SECTOR_DEG * 2;
export const STEIN_FACET = 0.014;
export const STEIN_WAIT_MS = 350;
export const VELVET_LOWPASS_MS = 80;

type MaterialDrag = {
  id: KlumpMaterialId;
  name: string;
  line: string;
  thresholdPt: number;
  gain: number;
  maxOut: number;
};

export const MATERIAL_DRAG: readonly MaterialDrag[] = [
  { id: 'gummi', name: 'Gummi', line: 'Myk. Litt fjæring.', thresholdPt: 6, gain: 0.85, maxOut: 0.19 },
  { id: 'skifer', name: 'Stein', line: 'Tydelig lagdeling.', thresholdPt: 12, gain: 0.18, maxOut: 0.055 },
  { id: 'kull', name: 'Kull', line: 'Dypest matt og porøst.', thresholdPt: 6, gain: 0.25, maxOut: 0.045 },
  { id: 'emalje', name: 'Plast', line: 'Glatt, med myk refleks.', thresholdPt: 8, gain: 0.35, maxOut: 0.075 },
  { id: 'floyel', name: 'Fløyel', line: 'Myk kant.', thresholdPt: 4, gain: 0.75, maxOut: 0.16 },
];

const TEXT_FIELD: Record<number, { w: number; h: number }> = {
  5: { w: 68, h: 78 },
  10: { w: 94, h: 96 },
  15: { w: 102, h: 104 },
  20: { w: 110, h: 112 },
};

type Point = { x: number; y: number };

function cubic(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

function samplePath(d: string): Point[] {
  const nums = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const pts: Point[] = [];
  if (nums.length < 8) return pts;
  let x = nums[0] ?? 0;
  let y = nums[1] ?? 0;
  let i = 2;
  while (i + 5 < nums.length) {
    const x1 = nums[i] ?? x;
    const y1 = nums[i + 1] ?? y;
    const x2 = nums[i + 2] ?? x;
    const y2 = nums[i + 3] ?? y;
    const x3 = nums[i + 4] ?? x;
    const y3 = nums[i + 5] ?? y;
    for (let step = 1; step <= 4; step += 1) {
      const t = step / 4;
      pts.push({ x: cubic(x, x1, x2, x3, t), y: cubic(y, y1, y2, y3, t) });
    }
    x = x3;
    y = y3;
    i += 6;
  }
  return pts;
}

function binAngle(index: number): number {
  return -Math.PI + ((index + 0.5) / FORM_BINS) * Math.PI * 2;
}

function buildBase(pts: Point[]): { cx: number; cy: number; radii: number[] } {
  const cx = pts.reduce((sum, p) => sum + p.x, 0) / pts.length;
  const cy = pts.reduce((sum, p) => sum + p.y, 0) / pts.length;
  const radii = Array.from({ length: FORM_BINS }, () => 0);
  const counts = Array.from({ length: FORM_BINS }, () => 0);
  for (const point of pts) {
    const angle = Math.atan2(point.y - cy, point.x - cx);
    const bin = Math.min(FORM_BINS - 1, Math.max(0, Math.floor(((angle + Math.PI) / (Math.PI * 2)) * FORM_BINS)));
    radii[bin] += Math.hypot(point.x - cx, point.y - cy);
    counts[bin] += 1;
  }
  for (let i = 0; i < FORM_BINS; i += 1) {
    if (counts[i] > 0) radii[i] /= counts[i];
  }
  for (let i = 0; i < FORM_BINS; i += 1) {
    if (radii[i] > 0) continue;
    let prev = i;
    let next = i;
    for (let step = 1; step < FORM_BINS; step += 1) {
      prev = (i - step + FORM_BINS) % FORM_BINS;
      next = (i + step) % FORM_BINS;
      if (radii[prev] > 0 || radii[next] > 0) break;
    }
    radii[i] = ((radii[prev] || 0) + (radii[next] || 0)) / ((radii[prev] ? 1 : 0) + (radii[next] ? 1 : 0) || 1);
  }
  return { cx, cy, radii };
}

const SAMPLES = samplePath(KLUMPEN_PATH);
const BASE = buildBase(SAMPLES);

export function emptyOffsets(): number[] {
  return Array.from({ length: FORM_BINS }, () => 0);
}

export function materialDrag(id: KlumpMaterialId): MaterialDrag {
  return MATERIAL_DRAG.find((item) => item.id === id) ?? MATERIAL_DRAG[0];
}

/** Angular width of one drag. Stein's facet and the broader materials are not Gummi's 40°. */
export function sectorRadians(id: KlumpMaterialId, widthPt: number, radiusPt: number): number {
  if (id === 'skifer') {
    const facet = STEIN_FACET * widthPt;
    const radius = Math.max(radiusPt, 1);
    const angle = 2 * Math.asin(Math.min(1, facet / 2 / radius));
    // The facet is narrower than one sample, so the nearest sample is that facet.
    return Math.max(angle, (Math.PI * 2) / FORM_BINS);
  }
  if (id === 'emalje' || id === 'floyel') return (BROAD_SECTOR_DEG * Math.PI) / 180;
  return (GUMMI_SECTOR_DEG * Math.PI) / 180;
}

/** Fløyel's 80 ms lowpass. A zero step holds the previous travel. */
export function velvetTravel(previous: number, raw: number, dtMs: number): number {
  if (dtMs <= 0) return previous;
  const k = 1 - Math.exp(-dtMs / VELVET_LOWPASS_MS);
  return previous + (raw - previous) * k;
}

function textField(minutes: number): { w: number; h: number } {
  if (minutes <= 5) return TEXT_FIELD[5];
  if (minutes <= 10) return TEXT_FIELD[10];
  if (minutes <= 15) return TEXT_FIELD[15];
  return TEXT_FIELD[20];
}

function rBound(angle: number, along: number, across: number): number {
  const c = Math.abs(Math.cos(angle));
  const s = Math.abs(Math.sin(angle));
  const x = c < 1e-4 ? Number.POSITIVE_INFINITY : along / c;
  const y = s < 1e-4 ? Number.POSITIVE_INFINITY : across / s;
  return Math.min(x, y);
}

/** Radius limits in points at one bin. The text field is the inner stop. */
export function radiusLimitsPt(minutes: number, widthPt: number, angle: number): { min: number; max: number } {
  const field = textField(minutes);
  const min = rBound(angle, field.w / 2 + 3, field.h / 2 + 3);
  const max = rBound(angle, 0.575 * widthPt, 0.51 * widthPt);
  return { min, max: Math.max(min, max) };
}

function pointsFor(offsets: readonly number[]): Point[] {
  return offsets.map((offset, index) => {
    const angle = binAngle(index);
    const radius = BASE.radii[index] + offset;
    return { x: BASE.cx + Math.cos(angle) * radius, y: BASE.cy + Math.sin(angle) * radius };
  });
}

export function deform(input: {
  start: readonly number[];
  material: KlumpMaterialId;
  minutes: number;
  widthPt: number;
  travelPt: number;
  angle: number;
  /** Finger moving away from the centre is outward. Kull uses a different gain. */
  radial?: 'in' | 'out';
  /** Stein does not move until 350 ms of calm drag. */
  elapsedMs?: number;
}): { offsets: number[]; changed: boolean } {
  const spec = materialDrag(input.material);
  const start = input.start.length === FORM_BINS ? [...input.start] : emptyOffsets();
  if (input.material === 'skifer' && (input.elapsedMs ?? 0) < STEIN_WAIT_MS) return { offsets: start, changed: false };
  if (input.travelPt < spec.thresholdPt) return { offsets: start, changed: false };
  const scale = input.widthPt / 1000;
  const outward = input.radial !== 'in';
  const gain = input.material === 'kull' ? (outward ? 0.25 : 0.55) : spec.gain;
  const capFrac = input.material === 'kull' ? (outward ? 0.045 : 0.1) : spec.maxOut;
  const sign = outward ? 1 : -1;
  const cap = capFrac * input.widthPt;
  const push = Math.min(cap, gain * input.travelPt) * sign;
  const next = start.map((offset, index) => {
    const angle = binAngle(index);
    const basePt = BASE.radii[index] * scale;
    const sector = sectorRadians(input.material, input.widthPt, Math.max(basePt, 1));
    let delta = Math.abs(angle - input.angle);
    if (delta > Math.PI) delta = Math.PI * 2 - delta;
    if (delta > sector) return offset;
    const weight = Math.cos((delta / sector) * (Math.PI / 2));
    const limits = radiusLimitsPt(input.minutes, input.widthPt, angle);
    const proposed = basePt + offset * scale + push * weight;
    const clamped = Math.min(limits.max, Math.max(limits.min, proposed));
    return (clamped - basePt) / scale;
  });
  return { offsets: next, changed: next.some((value, index) => value !== start[index]) };
}

/** Contour around the centroid, in points, y down. A saved offset moves the real samples radially. */
export function contourInPoints(offsets: readonly number[], widthPt: number): { x: number; y: number }[] {
  const scale = widthPt / 1000;
  const extra = offsets.length === FORM_BINS ? offsets : emptyOffsets();
  return SAMPLES.map((point) => {
    const dx = point.x - BASE.cx;
    const dy = point.y - BASE.cy;
    const angle = Math.atan2(dy, dx);
    const bin = Math.min(FORM_BINS - 1, Math.max(0, Math.floor(((angle + Math.PI) / (Math.PI * 2)) * FORM_BINS)));
    const radius = Math.hypot(dx, dy) + (extra[bin] ?? 0);
    return { x: Math.cos(angle) * radius * scale, y: Math.sin(angle) * radius * scale };
  });
}

/** Outward offset of the current contour. The session ring uses the same normal step. */
export function outsetContour(points: readonly { x: number; y: number }[], distance: number): { x: number; y: number }[] {
  const n = points.length;
  return points.map((point, index) => {
    const prev = points[(index + n - 1) % n];
    const next = points[(index + 1) % n];
    const tx = next.x - prev.x;
    const ty = next.y - prev.y;
    const len = Math.hypot(tx, ty) || 1;
    let nx = -ty / len;
    let ny = tx / len;
    if (nx * point.x + ny * point.y < 0) {
      nx = -nx;
      ny = -ny;
    }
    return { x: point.x + nx * distance, y: point.y + ny * distance };
  });
}

export function stonePath(offsets: readonly number[]): string {
  if (offsets.length !== FORM_BINS || offsets.every((value) => Math.abs(value) < 0.05)) return KLUMPEN_PATH;
  const pts = pointsFor(offsets);
  const body = pts.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
  return `${body} Z`;
}
