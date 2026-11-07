import { PRESET_MINUTES } from '../data/copy.ts';
import { FORM_BINS, contourInPoints } from '../onboarding/formShape.ts';

/**
 * Session Klumpen («Småstein»). The radii are the 176 pt silhouette sampled
 * around its centroid. A session draws that outline at `120 + 40·index` pt,
 * the same stops as Hjem (5 / 10 / 15 / 20 minutes).
 * Angle 0 is the top and increases clockwise, which is how the hold arc is measured.
 *
 * Deformation uses the reference angle TH (0 at the right, clockwise in
 * screen space): r × (1 + size + squash·cos 2θ + wobble·cos(3θ − φ)).
 * Positive squash widens x and flattens y.
 */

/** One sample every 2°. Index 0 is the top. */
export const KLUMPEN_RADII: readonly number[] = [
  75.419, 75.078, 74.8, 74.584, 74.429, 74.332,
  74.294, 74.316, 74.396, 74.531, 74.714, 74.935,
  75.18, 75.444, 75.728, 76.044, 76.405, 76.796,
  77.208, 77.641, 78.101, 78.587, 79.089, 79.605,
  80.134, 80.676, 81.227, 81.778, 82.324, 82.866,
  83.402, 83.919, 84.407, 84.874, 85.315, 85.713,
  86.062, 86.382, 86.658, 86.874, 87.051, 87.205,
  87.3, 87.329, 87.322, 87.302, 87.262, 87.24,
  87.272, 87.378, 87.567, 87.846, 88.221, 88.694,
  89.268, 89.942, 90.716, 91.581, 92.51, 93.458,
  94.298, 94.892, 95.395, 95.642, 95.609, 95.309,
  94.696, 93.844, 92.768, 91.507, 90.145, 88.693,
  87.197, 85.709, 84.236, 82.794, 81.407, 80.091,
  78.841, 77.663, 76.561, 75.54, 74.603, 73.743,
  72.959, 72.247, 71.609, 71.045, 70.554, 70.14,
  69.801, 69.538, 69.35, 69.235, 69.194, 69.226,
  69.332, 69.512, 69.767, 70.096, 70.5, 70.976,
  71.524, 72.141, 72.828, 73.583, 74.406, 75.299,
  76.264, 77.299, 78.398, 79.554, 80.76, 82.012,
  83.299, 84.599, 85.891, 87.163, 88.377, 89.495,
  90.497, 91.333, 91.972, 92.402, 92.582, 92.547,
  92.295, 91.843, 91.365, 90.68, 89.87, 89.061,
  88.301, 87.624, 87.042, 86.558, 86.174, 85.891,
  85.708, 85.627, 85.651, 85.782, 86.014, 86.318,
  86.648, 86.969, 87.28, 87.569, 87.827, 88.061,
  88.266, 88.428, 88.538, 88.594, 88.593, 88.531,
  88.402, 88.206, 87.948, 87.626, 87.242, 86.797,
  86.302, 85.761, 85.176, 84.555, 83.907, 83.239,
  82.555, 81.863, 81.17, 80.482, 79.806, 79.149,
  78.517, 77.907, 77.325, 76.779, 76.276, 75.819,
];

const TWO_PI = Math.PI * 2;

export type OutlineBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
};

type PathBuilder = {
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  close(): void;
};

/** Radii in the session sample, or null when the saved form is the base silhouette. */
export function savedSessionRadii(offsets: readonly number[] | null | undefined): number[] | null {
  if (!offsets || offsets.length !== FORM_BINS || offsets.every((value) => Math.abs(value) < 0.05)) return null;
  const samples = contourInPoints(offsets, SESSION_STONE_BASE).map((point) => ({
    angle: Math.atan2(point.y, point.x),
    radius: Math.hypot(point.x, point.y),
  }));
  const n = KLUMPEN_RADII.length;
  const radii: number[] = [];
  for (let i = 0; i < n; i += 1) {
    const phi = (i / n) * TWO_PI;
    const angle = Math.atan2(-Math.cos(phi), Math.sin(phi));
    let best = samples[0];
    let bestDelta = Infinity;
    for (const sample of samples) {
      let delta = Math.abs(sample.angle - angle);
      if (delta > Math.PI) delta = TWO_PI - delta;
      if (delta < bestDelta) {
        bestDelta = delta;
        best = sample;
      }
    }
    radii.push(best?.radius ?? KLUMPEN_RADII[i]);
  }
  return radii;
}

export function klumpenPoints(
  sq: number,
  wob: number,
  size: number,
  phase: number,
  offset: number,
  radii?: readonly number[] | null,
): { xs: number[]; ys: number[] } {
  'worklet';
  const table = radii && radii.length === KLUMPEN_RADII.length ? radii : KLUMPEN_RADII;
  const n = table.length;
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < n; i += 1) {
    const phi = (i / n) * TWO_PI;
    const th = phi - Math.PI / 2;
    const base = table[i] ?? 0;
    const r = base * (1 + size + sq * Math.cos(2 * th) + wob * Math.cos(3 * th - phase));
    xs.push(r * Math.sin(phi));
    ys.push(r * Math.cos(phi));
  }
  if (offset === 0) return { xs, ys };
  const ox: number[] = [];
  const oy: number[] = [];
  for (let i = 0; i < n; i += 1) {
    const i0 = (i + n - 1) % n;
    const i1 = (i + 1) % n;
    const tx = xs[i1] - xs[i0];
    const ty = ys[i1] - ys[i0];
    const len = Math.hypot(tx, ty) || 1;
    let nx = -ty / len;
    let ny = tx / len;
    if (nx * xs[i] + ny * ys[i] < 0) {
      nx = -nx;
      ny = -ny;
    }
    ox.push(xs[i] + nx * offset);
    oy.push(ys[i] + ny * offset);
  }
  return { xs: ox, ys: oy };
}

export function outlineBounds(xs: number[], ys: number[]): OutlineBounds {
  'worklet';
  let minX = xs[0];
  let maxX = xs[0];
  let minY = ys[0];
  let maxY = ys[0];
  for (let i = 1; i < xs.length; i += 1) {
    if (xs[i] < minX) minX = xs[i];
    if (xs[i] > maxX) maxX = xs[i];
    if (ys[i] < minY) minY = ys[i];
    if (ys[i] > maxY) maxY = ys[i];
  }
  return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
}

const rest = klumpenPoints(0, 0, 0, 0, 0);
export const KLUMPEN_BOUNDS = outlineBounds(rest.xs, rest.ys);

/** Sampled silhouette. Session widths are `120 + 40·index`, then scaled from this. */
export const SESSION_STONE_BASE = KLUMPEN_BOUNDS.width;
export const SESSION_STONE_MIN = 120;
export const SESSION_STONE_STEP = 40;

/**
 * Rest texture canvas. The 176 pt stone is centred in it, so the image centre
 * is the bounding-box centre. The lip light outside the edge lives in the alpha.
 */
export const SESSION_TEXTURE_PT = { width: 192, height: 164 } as const;

/** Nearest of 5 / 10 / 15 / 20. Anything off the stops rounds to the closer index. */
export function sessionStoneIndex(minutes: number): number {
  if (!Number.isFinite(minutes)) return 1;
  const step = PRESET_MINUTES[1] - PRESET_MINUTES[0];
  const raw = (minutes - PRESET_MINUTES[0]) / step;
  const last = PRESET_MINUTES.length - 1;
  return Math.min(last, Math.max(0, Math.round(raw)));
}

export function sessionStoneWidth(minutes: number): number {
  return SESSION_STONE_MIN + SESSION_STONE_STEP * sessionStoneIndex(minutes);
}

export function sessionStoneScale(minutes: number): number {
  return sessionStoneWidth(minutes) / SESSION_STONE_BASE;
}

/**
 * Screen-space offset of the centroid from the bounding-box centre.
 * At the sampled 176 pt size this is about +0.7 pt x and +2.4 pt y.
 * Scaling the outline around the centroid grows the offset with the stone.
 */
export function centroidOffset(scale: number): { x: number; y: number } {
  const boxCx = (KLUMPEN_BOUNDS.minX + KLUMPEN_BOUNDS.maxX) / 2;
  const boxCy = (KLUMPEN_BOUNDS.minY + KLUMPEN_BOUNDS.maxY) / 2;
  return { x: -boxCx * scale, y: boxCy * scale };
}

/** Texture rect. Its centre sits on the box centre, which is not the centroid. */
export function sessionTextureRect(
  cx: number,
  cy: number,
  scale: number,
): { x: number; y: number; width: number; height: number } {
  const shift = centroidOffset(scale);
  const shapeCx = cx - shift.x;
  const shapeCy = cy - shift.y;
  const width = SESSION_TEXTURE_PT.width * scale;
  const height = SESSION_TEXTURE_PT.height * scale;
  return { x: shapeCx - width / 2, y: shapeCy - height / 2, width, height };
}

/** Screen y grows downward. The contour uses the same deformed outline as the fill. */
export function writeKlumpenPath(
  builder: PathBuilder,
  cx: number,
  cy: number,
  sq: number,
  wob: number,
  size: number,
  phase: number,
  offset: number,
  scale: number,
  radii?: readonly number[] | null,
): void {
  'worklet';
  const { xs, ys } = klumpenPoints(sq, wob, size, phase, offset, radii);
  builder.moveTo(cx + xs[0] * scale, cy - ys[0] * scale);
  for (let i = 1; i < xs.length; i += 1) builder.lineTo(cx + xs[i] * scale, cy - ys[i] * scale);
  builder.close();
}
