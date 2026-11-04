/**
 * Hold-to-end, variant A. Numbers follow the hold spec (the reference
 * `Scenario.state`): three phases inside `HOLD_TO_END_MS`, an arc that grows
 * clockwise from the top, and a rubber spring on the shape only.
 * Light falls back with ease-out cubic. The shape does not.
 */
import { HOLD_TO_END_MS } from '../data/copy.ts';

export { HOLD_TO_END_MS };

/** 13/40, 27/40 and 40/40 of the hold. 1300 / 2700 / 4000 ms when the hold is 4 s. */
const PHASE_NUM = [13, 27, 40] as const;

export const GLOW_LEVELS = [0, 0.3, 0.62, 0.9] as const;

export const HOLD = {
  releaseMs: 300,
  textXfadeMs: 180,
  textReturnMs: 120,
  donePeakMs: 140,
  doneSettleMs: 460,
  doneFadeAtMs: 650,
  doneFadeMs: 300,
  gapPt: 10,
  trackW: 2.5,
  litWMax: 4,
  glowRMin: 4,
  glowRFull: 9,
  glowRPeak: 13,
  glowAMax: 0.85,
  glowGain: 2.6,
  highlightA: 0.35,
  highlightW: 0.8,
  arcTip: 0.025,
  arcStart: 0.006,
  squashPress: 0.014,
  squashHold: 0.026,
  breathAmp: 0.014,
  breathMs: 1400,
  wobbleAmp: 0.01,
  wobbleRotMs: 5000,
  sizePress: -0.006,
  sizeBreath: 0.004,
  /** SwiftUI spring(response: 0.40, dampingFraction: 0.55). Mass 1, stiffness ~247, damping ~17.3. */
  springResponseS: 0.4,
  springDamping: 0.55,
  pressedMix: 0.5,
  pressedInMs: 150,
  pressedOutMs: 250,
  slackPt: 24,
} as const;

/** Stroke sits on this offset of the Klumpen edge: the 10 pt gap plus half the rest stroke. */
export const RING_OFFSET = HOLD.gapPt + HOLD.trackW / 2;

const SPRING_W0 = (2 * Math.PI) / HOLD.springResponseS;
const SPRING_Z = HOLD.springDamping;

export type HoldGesture = {
  pressAt: number | null;
  releaseAt: number | null;
  doneAt: number | null;
};

export type HoldOptions = {
  reduceMotion: boolean;
  solid: boolean;
};

export type HoldSample = {
  holdMs: number;
  e: number;
  en: number;
  prog: number;
  glowR: number;
  strokeW: number;
  litMix: number;
  litAlpha: number;
  glowAlpha: number;
  pressed: number;
  /** 1 draws the travelling arc. 0 crossfades the whole contour (Reduce Motion). */
  arc: number;
  solid: number;
  /** 0–2 are the phases. 3 is the completed line. */
  textCur: number;
  textPrev: number;
  textXf: number;
  fade: number;
  held: boolean;
};

export type SpringState = {
  sq: number;
  sqV: number;
  wob: number;
  wobV: number;
  size: number;
  sizeV: number;
};

export const REST_SPRING: SpringState = { sq: 0, sqV: 0, wob: 0, wobV: 0, size: 0, sizeV: 0 };

export function clamp01(x: number): number {
  'worklet';
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

export function easeOutCubic(x: number): number {
  'worklet';
  const t = clamp01(x);
  const u = 1 - t;
  return 1 - u * u * u;
}

export function easeInOutSine(x: number): number {
  'worklet';
  return 0.5 - 0.5 * Math.cos(Math.PI * clamp01(x));
}

/** smoothstep between two edges. The edges may be reversed, matching the reference mask. */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  'worklet';
  const span = edge1 - edge0;
  if (span === 0) return x < edge0 ? 0 : 1;
  const t = clamp01((x - edge0) / span);
  return t * t * (3 - 2 * t);
}

export function phaseEndMs(index: 0 | 1 | 2, total = HOLD_TO_END_MS): number {
  'worklet';
  return (PHASE_NUM[index] * total) / 40;
}

export function phaseIndex(holdMs: number, total = HOLD_TO_END_MS): number {
  'worklet';
  if (holdMs < phaseEndMs(0, total)) return 0;
  if (holdMs < phaseEndMs(1, total)) return 1;
  return 2;
}

/** Glow level e at a hold time. Ease-in-out sine inside each phase, so the boundaries step. */
export function glowLevel(holdMs: number, total = HOLD_TO_END_MS): number {
  'worklet';
  const ms = holdMs < 0 ? 0 : holdMs;
  const bounds = [0, phaseEndMs(0, total), phaseEndMs(1, total), phaseEndMs(2, total)];
  for (let i = 0; i < 3; i += 1) {
    if (ms <= bounds[i + 1]) {
      const span = bounds[i + 1] - bounds[i];
      const t = span === 0 ? 1 : (ms - bounds[i]) / span;
      return GLOW_LEVELS[i] + (GLOW_LEVELS[i + 1] - GLOW_LEVELS[i]) * easeInOutSine(t);
    }
  }
  return GLOW_LEVELS[3];
}

export function isHeld(g: HoldGesture, t: number): boolean {
  'worklet';
  if (g.pressAt == null || t < g.pressAt) return false;
  if (g.doneAt != null) return t < g.doneAt;
  if (g.releaseAt != null) return t < g.releaseAt;
  return true;
}

export function holdMsAt(g: HoldGesture, t: number): number {
  'worklet';
  if (g.pressAt == null || t < g.pressAt) return 0;
  let stop = t;
  if (g.doneAt != null && g.doneAt < stop) stop = g.doneAt;
  if (g.releaseAt != null && (g.doneAt == null || g.releaseAt < g.doneAt) && g.releaseAt < stop) stop = g.releaseAt;
  const held = stop - g.pressAt;
  return held < 0 ? 0 : held;
}

/** 0–2 while holding, 0 again 120 ms after an early release, 3 once the hold completes. */
export function textIndexAt(g: HoldGesture, t: number): number {
  'worklet';
  if (g.pressAt == null || t < g.pressAt) return 0;
  if (g.doneAt != null && t >= g.doneAt) return 3;
  if (g.releaseAt != null && g.doneAt == null && t >= g.releaseAt + HOLD.textReturnMs) return 0;
  return phaseIndex(holdMsAt(g, t));
}

export function textCrossfade(g: HoldGesture, now: number): { cur: number; prev: number; xf: number } {
  'worklet';
  const cur = textIndexAt(g, now);
  const prev = textIndexAt(g, now - HOLD.textXfadeMs);
  if (prev === cur) return { cur, prev, xf: 1 };
  let t0 = now - HOLD.textXfadeMs;
  if (t0 < 0) t0 = 0;
  while (t0 < now && textIndexAt(g, t0) !== cur) t0 += 1;
  return { cur, prev, xf: easeInOutSine((now - t0) / HOLD.textXfadeMs) };
}

export function pressedAmount(g: HoldGesture, now: number): number {
  'worklet';
  if (g.pressAt == null || now < g.pressAt) return 0;
  const held = isHeld(g, now);
  const tr = g.doneAt != null ? g.doneAt : g.releaseAt;
  if (!held && tr != null) {
    return (1 - clamp01((now - tr) / HOLD.pressedOutMs)) * HOLD.pressedMix;
  }
  if (held) return clamp01((now - g.pressAt) / HOLD.pressedInMs) * HOLD.pressedMix;
  return 0;
}

/** Targets the rubber spring chases while the finger is down. Zeros when it is not. */
export function springTargets(holdMs: number, e: number): { sq: number; wob: number; size: number } {
  'worklet';
  const en = clamp01(e / 0.9);
  const breath = (2 * Math.PI * holdMs) / HOLD.breathMs;
  return {
    sq: HOLD.squashPress + HOLD.squashHold * en + HOLD.breathAmp * en * Math.sin(breath),
    wob: HOLD.wobbleAmp * en,
    size: HOLD.sizePress + HOLD.sizeBreath * en * Math.cos(breath),
  };
}

function integrate(x: number, v: number, target: number, dt: number): { x: number; v: number } {
  'worklet';
  const a = -SPRING_W0 * SPRING_W0 * (x - target) - 2 * SPRING_Z * SPRING_W0 * v;
  const nv = v + a * dt;
  return { x: x + nv * dt, v: nv };
}

/** Semi-implicit Euler, 1 ms substeps, matching the reference simulation. dt is seconds. */
export function stepSpring(state: SpringState, target: { sq: number; wob: number; size: number }, dt: number): SpringState {
  'worklet';
  const capped = dt > 0.032 ? 0.032 : dt < 0 ? 0 : dt;
  const steps = Math.max(1, Math.round(capped / 0.001));
  const h = capped / steps;
  let sq = state.sq;
  let sqV = state.sqV;
  let wob = state.wob;
  let wobV = state.wobV;
  let size = state.size;
  let sizeV = state.sizeV;
  for (let i = 0; i < steps; i += 1) {
    const a = integrate(sq, sqV, target.sq, h);
    sq = a.x;
    sqV = a.v;
    const b = integrate(wob, wobV, target.wob, h);
    wob = b.x;
    wobV = b.v;
    const c = integrate(size, sizeV, target.size, h);
    size = c.x;
    sizeV = c.v;
  }
  return { sq, sqV, wob, wobV, size, sizeV };
}

export function sampleHold(g: HoldGesture, now: number, options: HoldOptions): HoldSample {
  'worklet';
  const h = holdMsAt(g, now);
  let e = glowLevel(h);
  let prog = h / HOLD_TO_END_MS;
  let glowR = HOLD.glowRMin + (HOLD.glowRFull - HOLD.glowRMin) * clamp01(e / 0.9);
  let fade = 0;
  const held = isHeld(g, now);
  if (g.doneAt != null && now >= g.doneAt) {
    const c = now - g.doneAt;
    const up = easeOutCubic(c / HOLD.donePeakMs);
    const dn = easeInOutSine((c - HOLD.donePeakMs) / HOLD.doneSettleMs);
    e = 0.9 + 0.1 * up - 0.1 * dn;
    glowR = options.reduceMotion ? HOLD.glowRFull : HOLD.glowRFull + (HOLD.glowRPeak - HOLD.glowRFull) * (up - dn);
    prog = 1;
    fade = easeInOutSine((c - HOLD.doneFadeAtMs) / HOLD.doneFadeMs);
  } else if (g.releaseAt != null && now >= g.releaseAt && g.doneAt == null) {
    const k = 1 - easeOutCubic((now - g.releaseAt) / HOLD.releaseMs);
    const radAt = glowR;
    e *= k;
    prog *= k;
    glowR = HOLD.glowRMin + (radAt - HOLD.glowRMin) * k;
  }
  const en = clamp01(e / 0.9);
  const arc = options.reduceMotion ? 0 : 1;
  const litMix = arc ? 0.45 + 0.55 * en : en;
  const litAlpha = arc ? (prog > 0.001 && e > 0.002 ? 1 : 0) : en;
  const glowAlpha = options.solid || e <= 0.002 ? 0 : HOLD.glowAMax * Math.min(1.15, e / 0.9);
  const strokeW = HOLD.trackW + (HOLD.litWMax - HOLD.trackW) * Math.min(1.05, e / 0.9);
  const text = textCrossfade(g, now);
  return {
    holdMs: h,
    e,
    en,
    prog,
    glowR,
    strokeW,
    litMix,
    litAlpha,
    glowAlpha,
    pressed: options.reduceMotion ? 0 : pressedAmount(g, now),
    arc,
    solid: options.solid ? 1 : 0,
    textCur: text.cur,
    textPrev: text.prev,
    textXf: text.xf,
    fade,
    held,
  };
}

/** Arc coverage at a clockwise angle. 0 is the top. Full ring once progress passes 0.999. */
export function arcAlpha(angle: number, progress: number): number {
  'worklet';
  if (progress <= 0.001) return 0;
  if (progress >= 0.999) return 1;
  const tip = smoothstep(progress + 0.0005, progress - HOLD.arcTip, angle);
  const start = smoothstep(0, HOLD.arcStart, angle);
  return tip * start;
}

export function withAlpha(color: string, alpha: number): string {
  'worklet';
  const a = clamp01(alpha);
  if (color.charAt(0) === '#') {
    const n = parseInt(color.slice(1), 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return `rgba(${r},${g},${b},${a})`;
  }
  const open = color.indexOf('(');
  const close = color.indexOf(')');
  const parts = color.slice(open + 1, close).split(',');
  const base = parseFloat(parts[3]);
  return `rgba(${parts[0]},${parts[1]},${parts[2]},${base * a})`;
}

/**
 * Declared above `mixHex` on purpose. The worklet plugin turns a `'worklet'`
 * function into a non-hoisted assignment and captures its closure then, so a
 * helper declared below is still undefined.
 */
function hexByte(n: number): string {
  'worklet';
  const s = n.toString(16);
  return s.length === 1 ? `0${s}` : s;
}

export function mixHex(from: string, to: string, t: number): string {
  'worklet';
  const a = parseInt(from.slice(1), 16);
  const b = parseInt(to.slice(1), 16);
  const k = clamp01(t);
  const r = Math.round(((a >> 16) & 255) + (((b >> 16) & 255) - ((a >> 16) & 255)) * k);
  const g = Math.round(((a >> 8) & 255) + (((b >> 8) & 255) - ((a >> 8) & 255)) * k);
  const bl = Math.round((a & 255) + ((b & 255) - (a & 255)) * k);
  return `#${hexByte(r)}${hexByte(g)}${hexByte(bl)}`;
}

function sortedStops(raw: number[]): number[] {
  'worklet';
  const out: number[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    let p = raw[i];
    if (p < 0) p = 0;
    else if (p > 1) p = 1;
    let j = out.length;
    while (j > 0 && out[j - 1] > p) j -= 1;
    if (j > 0 && p - out[j - 1] < 0.0004) continue;
    out.splice(j, 0, p);
  }
  return out;
}

/** Sweep stops for the lit contour. `arc` false paints the whole ring at `alpha`. */
export function contourGradient(
  progress: number,
  color: string,
  alpha: number,
  arc: boolean,
): { colors: string[]; positions: number[] } {
  'worklet';
  if (!arc || progress >= 0.999) {
    const c = withAlpha(color, alpha);
    return { colors: [c, c], positions: [0, 1] };
  }
  if (progress <= 0.001 || alpha <= 0) {
    const c = withAlpha(color, 0);
    return { colors: [c, c], positions: [0, 1] };
  }
  const tip0 = progress - HOLD.arcTip;
  const tip1 = progress + 0.0005;
  const positions = sortedStops([
    0,
    0.0015,
    0.003,
    0.0045,
    0.006,
    0.012,
    tip0 - 0.008,
    tip0,
    tip0 + (tip1 - tip0) * 0.35,
    tip0 + (tip1 - tip0) * 0.65,
    tip1,
    tip1 + 0.008,
    1,
  ]);
  const colors: string[] = [];
  for (let i = 0; i < positions.length; i += 1) {
    colors.push(withAlpha(color, alpha * arcAlpha(positions[i], progress)));
  }
  return { colors, positions };
}
