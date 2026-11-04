/**
 * BOR-38. The grey track and the lit arc are drawing only.
 * The hold itself stays 4 s: glow, phases, and completion do not move.
 * The track fades in over the first 150 ms. The arc then fills from north
 * across the remaining 3.85 s, so it is full at 4000 ms.
 */

export const TRACK_IN_MS = 150;
export const TRACK_OUT_MS = 250;
/** Arc fill window. 4000 − 150. */
export const ARC_FILL_MS = 3850;

function clamp01(x: number): number {
  'worklet';
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

/** Cubic with endpoints (0, 0) and (1, 1). `a` and `b` are one axis of the inner controls. */
function unitBezier(t: number, a: number, b: number): number {
  'worklet';
  const c = 3 * a;
  const d = 3 * (b - a) - c;
  const e = 1 - c - d;
  return ((e * t + d) * t + c) * t;
}

function unitBezierSlope(t: number, a: number, b: number): number {
  'worklet';
  const c = 3 * a;
  const d = 3 * (b - a) - c;
  const e = 1 - c - d;
  return (3 * e * t + 2 * d) * t + c;
}

/** CSS cubic-bezier(x1, y1, x2, y2), solved for y at x. */
export function cubicBezier(x: number, x1: number, y1: number, x2: number, y2: number): number {
  'worklet';
  const target = clamp01(x);
  if (target === 0 || target === 1) return target;
  let t = target;
  for (let i = 0; i < 8; i += 1) {
    const slope = unitBezierSlope(t, x1, x2);
    if (slope < 1e-6 && slope > -1e-6) break;
    t -= (unitBezier(t, x1, x2) - target) / slope;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
  }
  return unitBezier(t, y1, y2);
}

/** 0 until 150 ms, then linear to 1 at 4000 ms. `holdMs` is already frozen on release. */
export function drawProgress(holdMs: number): number {
  'worklet';
  if (holdMs <= TRACK_IN_MS) return 0;
  const filled = (holdMs - TRACK_IN_MS) / ARC_FILL_MS;
  if (filled < 0) return 0;
  if (filled > 1) return 1;
  return filled;
}

/**
 * Opacity shared by the grey track and the lit arc.
 * Ease-out in over 150 ms, ease-in out over 250 ms from the opacity reached.
 * `releaseAt` and `doneAt` are −1 when unset. Reduce Motion snaps.
 */
export function strokeOpacity(
  pressed: boolean,
  holdMs: number,
  now: number,
  releaseAt: number,
  doneAt: number,
  reduceMotion: boolean,
): number {
  'worklet';
  if (doneAt >= 0 && now >= doneAt) return 1;
  if (!pressed) return 0;
  const released = releaseAt >= 0 && now >= releaseAt;
  if (reduceMotion) return released ? 0 : 1;
  const shown = cubicBezier(Math.min(holdMs, TRACK_IN_MS) / TRACK_IN_MS, 0, 0, 0.58, 1);
  if (!released) return shown;
  const fade = cubicBezier((now - releaseAt) / TRACK_OUT_MS, 0.42, 0, 1, 1);
  return shown * (1 - fade);
}
