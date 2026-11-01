/**
 * «Sluket» v2 timeline. Pure numbers so the motion can be tested without Skia.
 * Functions called from the UI thread are marked 'worklet'.
 * The rest frame is not drawn here: it is the same wordmark PNG as the native splash.
 * Reduce-motion timings are duplicated from splashTiming.ts so this file can
 * stay free of imports the UI-thread bundle and the node tests both have to load.
 */
export const REDUCE_HOLD_MS = 600;
export const REDUCE_FADE_MS = 200;

export const SPLASH_MS = 2000;
export const HANDOVER_AT = 1850;
export const HANDOVER_MS = 150;
export const REST_AT = 1550;
export const WORD_AT = 1250;
export const SWALLOW_AT = 1100;
export const TIGHTEN_AT = 800;
export const SWIRL_AT = 380;
export const FLOOD_AT = 120;

export const STIMULUS_COUNT = 96;
export const MORPH_COUNT = 24;
export const LOW_POWER_COUNT = 64;
export const LOW_POWER_SIGMA = 8;
export const SIGMA_MAX = 12;
export const MAX_TURNS = 1.25;
export const SPLASH_SEED = 0xb0ed;

export const WORDMARK_W = 160;
export const WORDMARK_H = 80;
/** Period glyph centre, relative to the window centre. Baked into the PNG. */
export const PERIOD_DX = 62.24;
export const PERIOD_DY = 0.31;
export const HOLE_DIAMETER = 10;
export const HOLE_DIAMETER_PEAK = 13.5;

/** Goo threshold. RGB stays 1 so the blur mixes colour; alpha sharpens the edge. */
export const ALPHA_GAIN = 18;
export const ALPHA_BIAS = -7;
export const GOO_MATRIX = [
  1, 0, 0, 0, 0,
  0, 1, 0, 0, 0,
  0, 0, 1, 0, 0,
  0, 0, 0, ALPHA_GAIN, ALPHA_BIAS,
] as const;

/** iOS system colours. Same in Lys and Mørk. Red is one of eight, so at most 1/8 of the shapes. */
export const NOISE_HEX = [
  '#FF3B30',
  '#FF9500',
  '#FFCC00',
  '#34C759',
  '#007AFF',
  '#5856D6',
  '#AF52DE',
  '#FF2D55',
] as const;

export type Rgb = readonly [number, number, number];

export const NOISE_RGB: readonly Rgb[] = NOISE_HEX.map(parseHex);

export type StimulusKind = 'badge' | 'pill' | 'squircle';

export type Stimulus = {
  kind: StimulusKind;
  /** 0 badge, 1 pill, 2 squircle. Passed into the worklet as a number. */
  kindId: number;
  color: Rgb;
  hex: string;
  /** 0–160 ms after the flood starts. Largest shapes first. */
  delay: number;
  angle: number;
  spin: 1 | -1;
  /** Start radius as a fraction of the screen diagonal (0.15–0.75). */
  r0: number;
  /** Flood size, 24–490 pt. */
  size: number;
  phase: number;
  /** Flake size while the ring tightens, 2–20 pt. */
  flake: number;
  /** One of the 24 shapes that may path-morph. The rest are circles. */
  morph: boolean;
};

export type WordmarkDraw = {
  /** 0 while the hole is on screen and the PNG is hidden. */
  opacity: number;
  translateX: number;
  translateY: number;
  scale: number;
  /** Pixels of the 160-wide PNG hidden from the left. 0 shows the whole word. */
  clipLeft: number;
  holeX: number;
  holeY: number;
  holeR: number;
};

const HIDDEN: readonly [number, number, number, number, number, number, number, number] = [0, 0, 0, 0, 1, 1, 0, 0];

export function parseHex(hex: string): Rgb {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function clamp01(value: number) {
  'worklet';
  return Math.max(0, Math.min(1, value));
}

function lerp(from: number, to: number, t: number) {
  'worklet';
  return from + (to - from) * t;
}

function bezier(t: number, p0: number, p1: number, p2: number, p3: number) {
  'worklet';
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

function bezierSlope(t: number, p0: number, p1: number, p2: number, p3: number) {
  'worklet';
  const u = 1 - t;
  return 3 * u * u * (p1 - p0) + 6 * u * t * (p2 - p1) + 3 * t * t * (p3 - p2);
}

/** Y of a unit cubic-bezier easing at time `x`. */
export function cubicBezierY(x1: number, y1: number, x2: number, y2: number, x: number) {
  'worklet';
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  let t = x;
  for (let i = 0; i < 8; i += 1) {
    const dx = bezier(t, 0, x1, x2, 1) - x;
    const slope = bezierSlope(t, 0, x1, x2, 1);
    if (Math.abs(slope) < 1e-6) break;
    t = Math.max(0, Math.min(1, t - dx / slope));
  }
  return bezier(t, 0, y1, y2, 1);
}

/** Underdamped spring, rest velocity 0. `tSec` is seconds from the start. */
export function springAt(
  tSec: number,
  from: number,
  to: number,
  damping: number,
  stiffness: number,
  mass: number,
) {
  'worklet';
  if (tSec <= 0) return from;
  const omega = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  const x0 = from - to;
  const decay = Math.exp(-zeta * omega * tSec);
  if (zeta >= 1) return to + decay * x0;
  const omegaD = omega * Math.sqrt(1 - zeta * zeta);
  const b = (zeta * omega * x0) / omegaD;
  return to + decay * (x0 * Math.cos(omegaD * tSec) + b * Math.sin(omegaD * tSec));
}

function smoothstep(edge0: number, edge1: number, x: number) {
  'worklet';
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Centred PNG rect in a window of `width` × `height`. The native splash uses the same centre. */
export function wordmarkFrame(width: number, height: number) {
  return {
    x: width / 2 - WORDMARK_W / 2,
    y: height / 2 - WORDMARK_H / 2,
    width: WORDMARK_W,
    height: WORDMARK_H,
  };
}

/**
 * 0 = full «bored.», 1 = only the period.
 * 0–120 sucks the word into the period, 1250–1550 rolls it back out, 1850–2000 sucks it in again.
 */
export function wordMask(tMs: number) {
  'worklet';
  if (tMs <= 0) return 0;
  if (tMs < FLOOD_AT) return cubicBezierY(0.55, 0, 1, 0.45, tMs / FLOOD_AT);
  if (tMs < WORD_AT) return 1;
  if (tMs < REST_AT) return 1 - cubicBezierY(0.22, 1, 0.36, 1, (tMs - WORD_AT) / (REST_AT - WORD_AT));
  if (tMs < HANDOVER_AT) return 0;
  return cubicBezierY(0.55, 0, 1, 0.45, clamp01((tMs - HANDOVER_AT) / HANDOVER_MS));
}

/** 1 = period at its place in the word. 0 = period at the window centre. */
export function periodShift(tMs: number) {
  'worklet';
  if (tMs <= 0) return 1;
  if (tMs < FLOOD_AT) return 1 - cubicBezierY(0.55, 0, 1, 0.45, tMs / FLOOD_AT);
  if (tMs < WORD_AT) return 0;
  if (tMs < REST_AT) return cubicBezierY(0.22, 1, 0.36, 1, (tMs - WORD_AT) / (REST_AT - WORD_AT));
  return 1;
}

/** Hole diameter in pt. 0 when the PNG is showing the period instead. */
export function holeDiameter(tMs: number) {
  'worklet';
  if (tMs < FLOOD_AT || tMs >= WORD_AT) return 0;
  if (tMs < SWALLOW_AT) return HOLE_DIAMETER;
  if (tMs < SWALLOW_AT + 80) return lerp(HOLE_DIAMETER, HOLE_DIAMETER_PEAK, (tMs - SWALLOW_AT) / 80);
  return Math.max(HOLE_DIAMETER, springAt((tMs - (SWALLOW_AT + 80)) / 1000, HOLE_DIAMETER_PEAK, HOLE_DIAMETER, 12, 300, 0.6));
}

export function handoverScale(tMs: number) {
  'worklet';
  if (tMs < HANDOVER_AT) return 1;
  return 1 - cubicBezierY(0.55, 0, 1, 0.45, clamp01((tMs - HANDOVER_AT) / HANDOVER_MS));
}

/** Blur sigma for the one goo layer. Low Power Mode stays at 8. */
export function gooSigma(tMs: number, lowPower: boolean) {
  'worklet';
  if (lowPower) return LOW_POWER_SIGMA;
  if (tMs < SWIRL_AT) return 4;
  if (tMs < TIGHTEN_AT) {
    const u = cubicBezierY(0.5, 0, 0.75, 0, (tMs - SWIRL_AT) / (TIGHTEN_AT - SWIRL_AT));
    return lerp(4, 10, u);
  }
  if (tMs < SWALLOW_AT) {
    const u = cubicBezierY(0.55, 0, 1, 0.45, (tMs - TIGHTEN_AT) / (SWALLOW_AT - TIGHTEN_AT));
    return lerp(10, SIGMA_MAX, u);
  }
  return SIGMA_MAX;
}

export function wobbleAmp(tMs: number) {
  'worklet';
  if (tMs < SWIRL_AT) return 0.04;
  if (tMs < TIGHTEN_AT) return lerp(0.04, 0.16, (tMs - SWIRL_AT) / (TIGHTEN_AT - SWIRL_AT));
  if (tMs < SWALLOW_AT) return lerp(0.16, 0.22, (tMs - TIGHTEN_AT) / (SWALLOW_AT - TIGHTEN_AT));
  return 0.22;
}

/** Turns around the hole. Ease-in over the 420 ms swirl, then on to 1.25 and no further. */
export function spinTurns(tMs: number) {
  'worklet';
  if (tMs <= SWIRL_AT) return 0;
  if (tMs >= WORD_AT) return MAX_TURNS;
  if (tMs < TIGHTEN_AT) {
    const u = cubicBezierY(0.4, 0, 1, 1, (tMs - SWIRL_AT) / (TIGHTEN_AT - SWIRL_AT));
    return 0.75 * u;
  }
  const u = cubicBezierY(0.55, 0, 1, 0.45, (tMs - TIGHTEN_AT) / (WORD_AT - TIGHTEN_AT));
  return 0.75 + 0.5 * u;
}

/**
 * [count, sigma cap, morph on].
 * Low Power Mode, or more than two dropped frames, drops to 64 circles and sigma 8.
 */
export function stimulusBudget(lowPower: number, droppedFrames: number) {
  'worklet';
  if (lowPower === 1 || droppedFrames > 2) {
    return [LOW_POWER_COUNT, LOW_POWER_SIGMA, 0] as const;
  }
  return [STIMULUS_COUNT, SIGMA_MAX, 1] as const;
}

export function createStimuli(seed = SPLASH_SEED): Stimulus[] {
  const rand = mulberry32(seed);
  const draft: Stimulus[] = [];
  for (let i = 0; i < STIMULUS_COUNT; i += 1) {
    const roll = rand();
    const kind: StimulusKind = roll < 0.5 ? 'badge' : roll < 0.8 ? 'pill' : 'squircle';
    draft.push({
      kind,
      kindId: kind === 'badge' ? 0 : kind === 'pill' ? 1 : 2,
      color: NOISE_RGB[i % NOISE_RGB.length]!,
      hex: NOISE_HEX[i % NOISE_HEX.length]!,
      delay: 0,
      angle: rand() * Math.PI * 2,
      spin: rand() < 0.5 ? -1 : 1,
      r0: 0.15 + rand() * 0.6,
      size: 24 + rand() * (490 - 24),
      phase: rand() * Math.PI * 2,
      flake: 2 + rand() * 18,
      morph: false,
    });
  }
  draft.sort((a, b) => b.size - a.size);
  for (let i = 0; i < draft.length; i += 1) {
    const item = draft[i]!;
    item.delay = (i / (STIMULUS_COUNT - 1)) * 160;
    item.morph = i < MORPH_COUNT;
  }
  return draft;
}

function popScale(tMs: number, delay: number) {
  'worklet';
  const start = FLOOD_AT + delay;
  if (tMs < start) return 0;
  if (tMs >= SWIRL_AT) return 1;
  return Math.max(0, springAt((tMs - start) / 1000, 0, 1, 14, 380, 0.6));
}

function orbitRadius(tMs: number, r0: number, diagonal: number) {
  'worklet';
  const lead = ((0.75 - r0) / 0.6) * 40;
  const t = tMs + lead;
  let frac = 1;
  if (t >= WORD_AT) frac = 0;
  else if (t >= SWALLOW_AT) frac = lerp(0.06, 0, clamp01((t - SWALLOW_AT) / (WORD_AT - SWALLOW_AT)));
  else if (t >= TIGHTEN_AT) {
    const u = cubicBezierY(0.55, 0, 1, 0.45, clamp01((t - TIGHTEN_AT) / (SWALLOW_AT - TIGHTEN_AT)));
    frac = lerp(0.45, 0.06, u);
  } else if (t >= SWIRL_AT) {
    const u = cubicBezierY(0.5, 0, 0.75, 0, clamp01((t - SWIRL_AT) / (TIGHTEN_AT - SWIRL_AT)));
    frac = lerp(1, 0.45, u);
  }
  return frac * r0 * diagonal;
}

function sizePx(tMs: number, size: number, flake: number, pop: number) {
  'worklet';
  if (pop <= 0) return 0;
  if (tMs < SWIRL_AT) return size * pop;
  if (tMs < TIGHTEN_AT) {
    const u = cubicBezierY(0.5, 0, 0.75, 0, (tMs - SWIRL_AT) / (TIGHTEN_AT - SWIRL_AT));
    return size * lerp(1, 0.5, u);
  }
  if (tMs < SWALLOW_AT) {
    const u = cubicBezierY(0.55, 0, 1, 0.45, (tMs - TIGHTEN_AT) / (SWALLOW_AT - TIGHTEN_AT));
    return lerp(size * 0.5, flake, u);
  }
  if (tMs < WORD_AT) return lerp(flake, 1, (tMs - SWALLOW_AT) / (WORD_AT - SWALLOW_AT));
  return 0;
}

function stretchX(tMs: number) {
  'worklet';
  const start = SWIRL_AT + 0.6 * (WORD_AT - SWIRL_AT);
  if (tMs < start) return 1;
  const u = cubicBezierY(0.55, 0, 1, 0.45, clamp01((tMs - start) / (WORD_AT - start)));
  return lerp(1, 3, u);
}

function stretchY(tMs: number) {
  'worklet';
  const start = SWIRL_AT + 0.6 * (WORD_AT - SWIRL_AT);
  if (tMs < start) return 1;
  const u = cubicBezierY(0.55, 0, 1, 0.45, clamp01((tMs - start) / (WORD_AT - start)));
  return lerp(1, 0.6, u);
}

/**
 * One stimulus, eight plain numbers:
 * [visible, x, y, radius, scaleX, scaleY, mix, rotation].
 * Hidden frames are [0, 0, 0, 0, 1, 1, 0, 0]. `mix` is the blend toward text.primary.
 */
export function sampleStimulus(
  index: number,
  delay: number,
  angle0: number,
  spin: number,
  r0: number,
  size: number,
  flake: number,
  tMs: number,
  width: number,
  height: number,
  lowPower: number,
) {
  'worklet';
  if (lowPower === 1 && index >= LOW_POWER_COUNT) return HIDDEN;
  if (tMs < FLOOD_AT || tMs >= WORD_AT) return HIDDEN;
  const pop = popScale(tMs, delay);
  if (pop <= 0) return HIDDEN;
  const diagonal = Math.hypot(width, height);
  const orbit = orbitRadius(tMs, r0, diagonal);
  if (orbit < 0.5) return HIDDEN;
  const px = sizePx(tMs, size, flake, pop);
  if (px <= 0) return HIDDEN;
  const theta = angle0 + spin * spinTurns(tMs) * Math.PI * 2;
  const r0px = Math.max(1, r0 * diagonal);
  const mix = smoothstep(0.4, 1, 1 - orbit / r0px);
  return [
    1,
    width / 2 + Math.cos(theta) * orbit,
    height / 2 + Math.sin(theta) * orbit,
    px / 2,
    stretchX(tMs),
    stretchY(tMs),
    mix,
    theta + Math.PI / 2,
  ] as const;
}

export type StimulusPose = {
  x: number;
  y: number;
  r: number;
  scaleX: number;
  scaleY: number;
  mix: number;
  rotation: number;
};

/** JS helper for tests. The UI thread calls sampleStimulus. */
export function samplePose(
  stimulus: Stimulus,
  index: number,
  tMs: number,
  width: number,
  height: number,
  lowPower: number,
): StimulusPose | null {
  const motion = sampleStimulus(
    index,
    stimulus.delay,
    stimulus.angle,
    stimulus.spin,
    stimulus.r0,
    stimulus.size,
    stimulus.flake,
    tMs,
    width,
    height,
    lowPower,
  );
  if (motion[0] === 0) return null;
  return {
    x: motion[1],
    y: motion[2],
    r: motion[3],
    scaleX: motion[4],
    scaleY: motion[5],
    mix: motion[6],
    rotation: motion[7],
  };
}

function blobRadius(kind: number, theta: number, radius: number, amp: number, timeSec: number, phase: number) {
  'worklet';
  const c = Math.abs(Math.cos(theta));
  const s = Math.abs(Math.sin(theta));
  let r = radius;
  if (kind === 1) {
    const rx = radius * 1.7;
    const ry = radius * 0.55;
    r = (rx * ry) / Math.max(0.001, Math.hypot(ry * Math.max(c, 1e-4), rx * Math.max(s, 1e-4)));
  } else if (kind === 2) {
    const n = 4;
    const v = Math.pow(Math.max(c, 1e-4), n) + Math.pow(Math.max(s, 1e-4), n);
    r = radius * Math.pow(v, -1 / n);
  }
  return r * (1 + amp * Math.sin(3 * theta + 9 * timeSec + phase));
}

type BlobBuilder = {
  moveTo(x: number, y: number): void;
  cubicTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void;
  close(): void;
};

function stretchPoint(
  px: number,
  py: number,
  cx: number,
  cy: number,
  tx: number,
  ty: number,
  nx: number,
  ny: number,
  scaleX: number,
  scaleY: number,
) {
  'worklet';
  const along = px * tx + py * ty;
  const across = px * nx + py * ny;
  return [cx + tx * along * scaleX + nx * across * scaleY, cy + ty * along * scaleX + ny * across * scaleY] as const;
}

/**
 * Closed blob of 8 cubics, so badge, pill and squircle share a verb count.
 * Stretch runs along `tangent` (the orbit direction).
 */
export function writeBlob(
  builder: BlobBuilder,
  kind: number,
  cx: number,
  cy: number,
  radius: number,
  amp: number,
  timeSec: number,
  phase: number,
  scaleX: number,
  scaleY: number,
  tangent: number,
) {
  'worklet';
  const n = 8;
  const step = (Math.PI * 2) / n;
  const handle = (4 / 3) * Math.tan(step / 4);
  const tx = -Math.sin(tangent);
  const ty = Math.cos(tangent);
  const nx = Math.cos(tangent);
  const ny = Math.sin(tangent);
  for (let i = 0; i < n; i += 1) {
    const a0 = i * step;
    const a1 = a0 + step;
    const r0 = blobRadius(kind, a0, radius, amp, timeSec, phase);
    const r1 = blobRadius(kind, a1, radius, amp, timeSec, phase);
    const s0 = stretchPoint(Math.cos(a0) * r0, Math.sin(a0) * r0, cx, cy, tx, ty, nx, ny, scaleX, scaleY);
    const s1 = stretchPoint(Math.cos(a1) * r1, Math.sin(a1) * r1, cx, cy, tx, ty, nx, ny, scaleX, scaleY);
    const h0 = stretchPoint(
      Math.cos(a0) * r0 - Math.sin(a0) * handle * r0,
      Math.sin(a0) * r0 + Math.cos(a0) * handle * r0,
      cx, cy, tx, ty, nx, ny, scaleX, scaleY,
    );
    const h1 = stretchPoint(
      Math.cos(a1) * r1 - (-Math.sin(a1)) * handle * r1,
      Math.sin(a1) * r1 - Math.cos(a1) * handle * r1,
      cx, cy, tx, ty, nx, ny, scaleX, scaleY,
    );
    if (i === 0) builder.moveTo(s0[0], s0[1]);
    builder.cubicTo(h0[0], h0[1], h1[0], h1[1], s1[0], s1[1]);
  }
  builder.close();
}

/** PNG pose for the current time. Translate is relative to the centred rest position. */
export function wordmarkDraw(tMs: number, width: number, height: number): WordmarkDraw {
  'worklet';
  const cx = width / 2;
  const cy = height / 2;
  const shift = periodShift(tMs);
  const mask = wordMask(tMs);
  const inHole = tMs >= FLOOD_AT && tMs < WORD_AT;
  return {
    opacity: inHole ? 0 : 1,
    translateX: (shift - 1) * PERIOD_DX,
    translateY: (shift - 1) * PERIOD_DY,
    scale: handoverScale(tMs),
    clipLeft: mask * (WORDMARK_W / 2 + 57.88 - 2),
    holeX: cx + shift * PERIOD_DX,
    holeY: cy + shift * PERIOD_DY,
    holeR: inHole ? holeDiameter(tMs) / 2 : 0,
  };
}
