import { KLUMPEN_PATH } from '../components/klumpenPath.ts';
import type { KlumpMaterialId } from '../data/types.ts';

/**
 * Edge drag for Form klumpen.
 * Thresholds, gains and outward limits are the part-1 material table.
 * The one stated sector is 40°. It is shared, because the other materials do not name one.
 * The preview is the silhouette. It does not invent a second material renderer.
 */

export const FORM_BINS = 48;
export const FORM_SECTOR_DEG = 40;

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
}): { offsets: number[]; changed: boolean } {
  const spec = materialDrag(input.material);
  const start = input.start.length === FORM_BINS ? [...input.start] : emptyOffsets();
  if (input.travelPt < spec.thresholdPt) return { offsets: start, changed: false };
  const scale = input.widthPt / 1000;
  const cap = spec.maxOut * input.widthPt;
  const push = Math.min(cap, spec.gain * input.travelPt);
  const sector = (FORM_SECTOR_DEG * Math.PI) / 180;
  const next = start.map((offset, index) => {
    const angle = binAngle(index);
    let delta = Math.abs(angle - input.angle);
    if (delta > Math.PI) delta = Math.PI * 2 - delta;
    if (delta > sector) return offset;
    const weight = Math.cos((delta / sector) * (Math.PI / 2));
    const basePt = BASE.radii[index] * scale;
    const limits = radiusLimitsPt(input.minutes, input.widthPt, angle);
    const proposed = basePt + offset * scale + push * weight;
    const clamped = Math.min(limits.max, Math.max(limits.min, proposed));
    return (clamped - basePt) / scale;
  });
  return { offsets: next, changed: next.some((value, index) => value !== start[index]) };
}

export function stonePath(offsets: readonly number[]): string {
  if (offsets.length !== FORM_BINS || offsets.every((value) => Math.abs(value) < 0.05)) return KLUMPEN_PATH;
  const pts = pointsFor(offsets);
  const body = pts.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
  return `${body} Z`;
}
