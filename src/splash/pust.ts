/**
 * D2 Pust. The S6 word stays on the rest frame. Only Klumpen scales,
 * 1 → 1.14 → 1 from 80 ms to 620 ms, anchored at its centre.
 * The bump is sin(π · easeInOutSine(u)), which is the sampled kurve-D2.json curve.
 * Always dark. The exit fade is not part of the scale; the plate owns that.
 */
import { S6_DOT_W } from './s6.ts';
import { INK_RGB, logoPose, REST_AT, type LogoPose } from './sluket.ts';
import { PUST_MOTION_MS, PUST_MS } from './splashTiming.ts';

export { PUST_MOTION_MS, PUST_MS };

export const PUST_FROM_MS = 80;
export const PUST_TO_MS = 620;
export const PUST_PEAK = 1.14;

export function easeInOutSine(t: number) {
  'worklet';
  const u = t <= 0 ? 0 : t >= 1 ? 1 : t;
  return 0.5 - 0.5 * Math.cos(Math.PI * u);
}

/** Uniform scale of Klumpen. 1 outside the breathe. */
export function pustScale(tMs: number) {
  'worklet';
  if (tMs <= PUST_FROM_MS || tMs >= PUST_TO_MS) return 1;
  const u = (tMs - PUST_FROM_MS) / (PUST_TO_MS - PUST_FROM_MS);
  const bump = Math.sin(Math.PI * easeInOutSine(u));
  return 1 + (PUST_PEAK - 1) * bump;
}

/** Rest pose, with Klumpen scaled about its own centre. The word is not scaled. */
export function pustPose(tMs: number): LogoPose {
  'worklet';
  const rest = logoPose(REST_AT, 1, INK_RGB);
  return {
    kw: S6_DOT_W * pustScale(tMs),
    dx: rest.dx,
    dy: rest.dy,
    r: rest.r,
    g: rest.g,
    b: rest.b,
    opacity: rest.opacity,
    clipLeft: rest.clipLeft,
    clipRight: rest.clipRight,
    front: rest.front,
    settled: rest.settled,
  };
}
