/**
 * Smooth cage for the shaping stone.
 * 48 radial bins are the controls. Catmull-Rom fills the segments so the
 * outline does not jump from corner to corner. The follow step eases the
 * shown bins toward the finger on the UI thread.
 */

export const SHAPE_FOLLOW = 0.45;
export const SMOOTH_SAMPLES = 4;

export type MotionPoint = { x: number; y: number };

function catmull(p0: MotionPoint, p1: MotionPoint, p2: MotionPoint, p3: MotionPoint, t: number): MotionPoint {
  'worklet';
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x:
      0.5 *
      (2 * p1.x +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y:
      0.5 *
      (2 * p1.y +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  };
}

/**
 * Closed Catmull-Rom samples. `samplesPerEdge` includes the start of each segment.
 * The fallback is a literal. A default that names SMOOTH_SAMPLES is not copied
 * into the UI worklet, so the first frame throws ReferenceError and aborts.
 */
export function smoothClosed(points: readonly MotionPoint[], samplesPerEdge?: number): MotionPoint[] {
  'worklet';
  const n = points.length;
  const out: MotionPoint[] = [];
  if (n < 3) return points.map((point) => ({ x: point.x, y: point.y }));
  const steps = samplesPerEdge == null || samplesPerEdge < 1 ? 4 : Math.floor(samplesPerEdge);
  for (let i = 0; i < n; i += 1) {
    const p0 = points[(i - 1 + n) % n] ?? points[0];
    const p1 = points[i] ?? points[0];
    const p2 = points[(i + 1) % n] ?? points[0];
    const p3 = points[(i + 2) % n] ?? points[0];
    if (!p0 || !p1 || !p2 || !p3) continue;
    for (let s = 0; s < steps; s += 1) out.push(catmull(p0, p1, p2, p3, s / steps));
  }
  return out;
}

/** One point per bin, around the centroid, in points. */
export function radialCage(
  offsets: readonly number[],
  widthPt: number,
  radii: readonly number[],
): MotionPoint[] {
  'worklet';
  const n = radii.length;
  const scale = widthPt / 1000;
  const out: MotionPoint[] = [];
  for (let i = 0; i < n; i += 1) {
    const angle = -Math.PI + ((i + 0.5) / n) * Math.PI * 2;
    const radius = ((radii[i] ?? 0) + (offsets[i] ?? 0)) * scale;
    out.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
  }
  return out;
}

/** Move each bin part of the way toward the finger. 1 would jump. */
export function followOffsets(
  current: readonly number[],
  target: readonly number[],
  gain?: number,
): { next: number[]; remaining: number } {
  'worklet';
  const step = gain == null ? 0.45 : gain;
  const next: number[] = [];
  let remaining = 0;
  const count = Math.max(current.length, target.length);
  for (let i = 0; i < count; i += 1) {
    const from = current[i] ?? 0;
    const to = target[i] ?? from;
    const value = from + (to - from) * step;
    next.push(value);
    const gap = Math.abs(to - value);
    if (gap > remaining) remaining = gap;
  }
  return { next, remaining };
}
