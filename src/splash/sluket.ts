/**
 * «Sluket» v5, preset C. Pure numbers, so the motion can be tested without Skia.
 * The draw loop is the v5 testbench (drawV5 / drawBlobs): pebbles fall into the
 * dot, the dot glides to the S6 period, then «bored» reveals from the right.
 * Always dark. Functions called from the UI thread are marked 'worklet'.
 */
import {
  S6_CLIP_L,
  S6_CLIP_R,
  S6_DOT_W,
  S6_DOT_X,
  S6_DOT_Y,
} from './s6.ts';

export const SPLASH_BG = '#111110';
export const SPLASH_INK = '#F8F6F2';
export const INK_RGB = [0xf8, 0xf6, 0xf2] as const;

/** Preset C, from the v5 testbench. tail = 250 + max(glide, 0.4·glide + reveal) + 300. */
export const STIMULUS_COUNT = 130;
export const LOW_POWER_COUNT = 80;
export const WOBBLE = 1.4;
export const MERGE = 1;
export const EASE_K = 0.95;
export const TURNS = 1.75;
export const SWIRL_K = 1.8;
export const SIZE_K = 0.9;
export const SHAPE_VAR = 0.85;
export const SAT = 1;
export const KLUMP0 = 0;
export const KLUMP1 = 52;
export const K_TINT = 0.75;
export const CALM = 0.85;
export const SETTLE_MS = 250;
export const GLIDE_MS = 500;
export const REVEAL_MS = 450;
export const REST_HOLD_MS = 300;
export const REVEAL_LEAD = 0.4;
export const SOFT_PT = 28;

const TAIL_MS = SETTLE_MS + Math.max(GLIDE_MS, REVEAL_LEAD * GLIDE_MS + REVEAL_MS) + REST_HOLD_MS;
export const SPLASH_MS = 3300;
export const SWIRL_MS = SPLASH_MS - TAIL_MS;
export const GLIDE_AT = SWIRL_MS + SETTLE_MS;
export const REVEAL_AT = GLIDE_AT + REVEAL_LEAD * GLIDE_MS;
export const REST_AT = GLIDE_AT + Math.max(GLIDE_MS, REVEAL_LEAD * GLIDE_MS + REVEAL_MS);
/** Colour mix leaves the tree once the ink has settled. S + 250 ms. */
export const MIX_OFF_AT = SWIRL_MS + SETTLE_MS;

export const MIX_START = 1;
export const MIX_END = 0.4;
export const MIX_EXP = 1.2;
export const MIX_FROM = 0;
export const MIX_TO = 0.8;
export const MIX_RADIUS_START = 20;
export const MIX_RADIUS_END = 40;
/** One mix cell is 4 pt. Low Power uses the same mix on an 8 pt grid. */
export const MIX_CELL_PT = 4;
export const MIX_CELL_LOW_PT = 8;

export const POSITION_SEED = 45293 ^ 8738;
export const OUTLINE_SEED = 45293 ^ 4711;

/** iOS system colours. Index i gets NOISE[i % 8], then saturation. */
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

const NP = 28;

export type Rgb = readonly [number, number, number];

export type Stimulus = {
  size: number;
  /** Start distance as a fraction of the screen diagonal. */
  r0: number;
  angle: number;
  rgb: Rgb;
  phase: number;
  rot0: number;
  flake: number;
  /** Share of the preset's revolutions, 0.8–1. */
  turnU: number;
  delay: number;
  /** Nearest shapes finish first. Added to the model clock, 0–150 ms. */
  shift: number;
  /** Unit pebble, 28 points: x, y, angle. Built once. */
  outline: readonly (readonly [number, number, number])[];
};

export type LogoPose = {
  kw: number;
  dx: number;
  dy: number;
  r: number;
  g: number;
  b: number;
  opacity: number;
  clipLeft: number;
  clipRight: number;
  front: number;
  settled: number;
};

function clamp01(value: number) {
  'worklet';
  return Math.max(0, Math.min(1, value));
}

function lerp(from: number, to: number, t: number) {
  'worklet';
  return from + (to - from) * t;
}

function smoothstep(edge0: number, edge1: number, x: number) {
  'worklet';
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function bez(t: number, p0: number, p1: number, p2: number, p3: number) {
  'worklet';
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

function bezSlope(t: number, p0: number, p1: number, p2: number, p3: number) {
  'worklet';
  const u = 1 - t;
  return 3 * u * u * (p1 - p0) + 6 * u * t * (p2 - p1) + 3 * t * t * (p3 - p2);
}

export function cubicBezierY(x1: number, y1: number, x2: number, y2: number, x: number) {
  'worklet';
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  let t = x;
  for (let i = 0; i < 8; i += 1) {
    const dx = bez(t, 0, x1, x2, 1) - x;
    const slope = bezSlope(t, 0, x1, x2, 1);
    if (Math.abs(slope) < 1e-6) break;
    t = Math.max(0, Math.min(1, t - dx / slope));
  }
  return bez(t, 0, y1, y2, 1);
}

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

/** Integrated spin weight, normalised so gAt(1250) is 1. */
const SPIN: number[] = (() => {
  const steps: number[] = [0];
  let acc = 0;
  for (let t = 381; t <= 1250; t += 1) {
    const w = t < 800 ? cubicBezierY(0.4, 0, 1, 1, (t - 380) / 420) : 1;
    acc += w;
    steps.push(acc);
  }
  return steps.map((value) => value / acc);
})();

function gAt(modelMs: number) {
  'worklet';
  if (modelMs <= 380) return 0;
  if (modelMs >= 1250) return 1;
  return SPIN[Math.round(modelMs - 380)] ?? 1;
}

/**
 * Model clock. 120–1250 ms of the shape timeline, warped by swirlK.
 * tl = 120 + (t / S) ^ swirlK · 1130. Above 1 the colours last longer
 * and the swallow comes later and faster.
 */
export function modelTime(tMs: number) {
  'worklet';
  if (tMs <= 0) return 120;
  if (tMs >= SWIRL_MS) return 1250;
  return 120 + Math.pow(tMs / SWIRL_MS, SWIRL_K) * 1130;
}

export function calmAt(tMs: number) {
  'worklet';
  return smoothstep(CALM * SWIRL_MS, SWIRL_MS + SETTLE_MS, tMs);
}

/** Paint-mix amount and radius across the swirl. */
export function mixAt(tMs: number) {
  'worklet';
  const u = tMs / SWIRL_MS;
  const x = clamp01((u - MIX_FROM) / (MIX_TO - MIX_FROM));
  const e = Math.pow(x, MIX_EXP);
  return {
    m: lerp(MIX_START, MIX_END, e),
    radius: lerp(MIX_RADIUS_START, MIX_RADIUS_END, e),
  };
}

/** The mix stays on in Low Power Mode. The kill switch is the only off switch. */
export function colorMixEnabled(flag: boolean) {
  return flag;
}

/** Low Power keeps the same picture with fewer pebbles and a coarser grid. */
export function mixCellPt(lowPower: boolean) {
  return lowPower ? MIX_CELL_LOW_PT : MIX_CELL_PT;
}

export function stimulusLimit(lowPower: boolean) {
  return lowPower ? LOW_POWER_COUNT : STIMULUS_COUNT;
}

/**
 * Radius and sigma for the mix shader, in the mix buffer's pixels.
 * The buffer is one pixel per `cell` pt, so a 20 pt radius is 20/cell pixels
 * on screen. PixelRatio is already accounted for by the buffer's point size.
 */
export function mixShaderUnits(pt: number, cell: number) {
  'worklet';
  return pt / Math.max(1, cell);
}

function sigmaBase(modelMs: number) {
  'worklet';
  if (modelMs < 380) return 4;
  if (modelMs < 800) return lerp(4, 10, (modelMs - 380) / 420);
  if (modelMs < 1100) return lerp(10, 12, (modelMs - 800) / 300);
  return 12;
}

/** Goo σ in pt. Ramps to 0 as the swallow finishes, then stays off. */
export function gooSigma(modelMs: number) {
  'worklet';
  if (modelMs >= 1250) return 0;
  const sigma = sigmaBase(modelMs) * MERGE;
  if (modelMs >= 1100) return sigma * ((1250 - modelMs) / 150);
  return sigma;
}

function wobbleAmp(modelMs: number) {
  'worklet';
  if (modelMs < 380) return 0.04;
  if (modelMs < 800) return lerp(0.04, 0.16, (modelMs - 380) / 420);
  if (modelMs < 1100) return lerp(0.16, 0.22, (modelMs - 800) / 300);
  return 0.22;
}

export function wobbleAt(modelMs: number) {
  'worklet';
  return wobbleAmp(modelMs) * WOBBLE;
}

export function phaseName(tMs: number) {
  const model = modelTime(tMs);
  if (tMs < SWIRL_MS) {
    if (model < 380) return 'arrive';
    if (model < 800) return 'swirl';
    if (model < 1100) return 'tighten';
    return 'swallow';
  }
  if (tMs < GLIDE_AT) return 'settle';
  if (tMs < REVEAL_AT) return 'glide';
  if (tMs < REST_AT) return 'reveal';
  if (tMs < SPLASH_MS) return 'rest';
  return 'done';
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

function hexToRgb(hex: string): Rgb {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

/** One pebble outline. Seed 45293 ^ 4711, 28 points, largest extent = 1. */
function pebbleOutline(rand: () => number, variation: number) {
  const asp = lerp(1 - 0.55 * variation, 1, rand());
  const hm = 0.02 + 0.16 * variation;
  const a2 = hm * 0.9 * rand();
  const a3 = hm * 0.55 * rand();
  const a4 = hm * 0.3 * rand();
  const p2 = rand() * Math.PI * 2;
  const p3 = rand() * Math.PI * 2;
  const p4 = rand() * Math.PI * 2;
  const rot = rand() * Math.PI * 2;
  const pts: [number, number][] = [];
  for (let i = 0; i < NP; i += 1) {
    const th = (i / NP) * Math.PI * 2;
    const rr = 1 + a2 * Math.cos(2 * th + p2) + a3 * Math.cos(3 * th + p3) + a4 * Math.cos(4 * th + p4);
    const x = rr * Math.cos(th);
    const y = rr * Math.sin(th) * asp;
    pts.push([x * Math.cos(rot) - y * Math.sin(rot), x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  let mx = 0;
  let my = 0;
  let x0 = 1e9;
  let x1 = -1e9;
  let y0 = 1e9;
  let y1 = -1e9;
  for (const q of pts) {
    mx += q[0] / NP;
    my += q[1] / NP;
    x0 = Math.min(x0, q[0]);
    x1 = Math.max(x1, q[0]);
    y0 = Math.min(y0, q[1]);
    y1 = Math.max(y1, q[1]);
  }
  const ext = Math.max(x1 - x0, y1 - y0);
  return pts.map((q) => {
    const x = (q[0] - mx) / ext;
    const y = (q[1] - my) / ext;
    return [x, y, Math.atan2(y, x)] as const;
  });
}

export function createStimuli(count = STIMULUS_COUNT): Stimulus[] {
  const rand = mulberry32(POSITION_SEED);
  const list: Stimulus[] = [];
  for (let i = 0; i < count; i += 1) {
    const rgb = hexToRgb(NOISE_HEX[i % NOISE_HEX.length]!);
    list.push({
      size: 24 + 466 * rand() ** 3.5,
      r0: 0.15 + 0.6 * rand() ** 1.2,
      angle: rand() * Math.PI * 2,
      rgb,
      phase: rand() * Math.PI * 2,
      rot0: rand() * Math.PI,
      flake: 2 + 18 * rand(),
      turnU: 0.8 + 0.2 * rand(),
      delay: 0,
      shift: 0,
      outline: [],
    });
  }
  const bySize = list.map((_, index) => index).sort((a, b) => list[b]!.size - list[a]!.size);
  bySize.forEach((index, rank) => {
    list[index]!.delay = count > 1 ? (rank / (count - 1)) * 160 : 0;
  });
  const byRadius = list.map((_, index) => index).sort((a, b) => list[a]!.r0 - list[b]!.r0);
  byRadius.forEach((index, rank) => {
    list[index]!.shift = count > 1 ? (1 - rank / (count - 1)) * 150 : 0;
  });
  const ordered = bySize.map((index) => list[index]!);
  const shapeRand = mulberry32(OUTLINE_SEED);
  for (const item of ordered) {
    const luma = 0.299 * item.rgb[0] + 0.587 * item.rgb[1] + 0.114 * item.rgb[2];
    item.rgb = [
      Math.round(luma + (item.rgb[0] - luma) * SAT),
      Math.round(luma + (item.rgb[1] - luma) * SAT),
      Math.round(luma + (item.rgb[2] - luma) * SAT),
    ];
    item.size *= SIZE_K;
    item.outline = pebbleOutline(shapeRand, SHAPE_VAR);
  }
  return ordered;
}

const HIDDEN = [0, 0, 0, 0, 0, 1, 1, 0, 0, 0] as const;
const SWALLOWED = [0, 1, 0, 0, 0, 1, 1, 0, 0, 0] as const;

/**
 * One pebble on the model clock.
 * [visible, swallowed, x, y, tan, scaleX, scaleY, own, size, inkMix]
 * swallowed is 1 once the pebble has entered the dot and is no longer drawn.
 * x and y are screen coordinates.
 */
export function sampleStimulus(
  index: number,
  delay: number,
  angle: number,
  r0: number,
  size: number,
  rot0: number,
  flake: number,
  turnU: number,
  shift: number,
  modelMs: number,
  width: number,
  height: number,
  limit: number,
  swallowR: number,
  calmE: number,
) {
  'worklet';
  if (index >= limit) return HIDDEN;
  if (modelMs < 120 + delay) return HIDDEN;
  const pop = Math.max(0, springAt((modelMs - 120 - delay) / 1000, 0, 1, 14, 380, 0.6));
  const te = modelMs < 380 ? modelMs : 380 + ((modelMs - 380) * 870) / (870 - shift);
  if (te >= 1250) return SWALLOWED;
  let rf = 1;
  let sz = size * pop;
  if (te >= 380 && te < 800) {
    const e = Math.pow(cubicBezierY(0.5, 0, 0.75, 0, (te - 380) / 420), EASE_K);
    rf = lerp(1, 0.45, e);
    sz = size * lerp(1, 0.5, e) * pop;
  } else if (te >= 800 && te < 1100) {
    const e = Math.pow(cubicBezierY(0.55, 0, 1, 0.45, (te - 800) / 300), EASE_K);
    rf = lerp(0.45, 0.06, e);
    sz = lerp(size * 0.5, flake, e) * pop;
  } else if (te >= 1100) {
    const u = (te - 1100) / 150;
    rf = 0.06 * (1 - u * u);
    sz = flake * (1 - 0.6 * u) * pop;
  }
  const dist = rf * r0 * Math.hypot(width, height);
  if (te > 800 && dist < swallowR) return SWALLOWED;
  const th = angle + turnU * TURNS * Math.PI * 2 * gAt(te);
  const stretch = smoothstep(0.6, 1, 1 - rf);
  const inkMix = smoothstep(0.4, 1, 1 - rf) * lerp(0.35, 1, calmE);
  return [
    1,
    0,
    width / 2 + Math.cos(th) * dist,
    height / 2 + Math.sin(th) * dist,
    th + Math.PI / 2,
    1 + 2 * stretch,
    1 - 0.4 * stretch,
    rot0 + (th - angle),
    sz,
    inkMix,
  ] as const;
}

export function klumpWidth(tMs: number) {
  'worklet';
  const tl = modelTime(tMs);
  if (tMs < SWIRL_MS) {
    const grown = cubicBezierY(0.45, 0, 0.25, 1, clamp01((tl - 380) / 870));
    const pop = KLUMP0 > 0 ? Math.max(0, springAt((tl - 120) / 1000, 0, 1, 14, 380, 0.6)) : 1;
    return lerp(KLUMP0, KLUMP1, grown) * pop;
  }
  const e = cubicBezierY(0.22, 1, 0.36, 1, clamp01((tMs - SWIRL_MS) / SETTLE_MS));
  const sprung = springAt((tMs - SWIRL_MS) / 1000, KLUMP1, S6_DOT_W, 12, 300, 0.6);
  return lerp(sprung, S6_DOT_W, e);
}

export function swallowRadius(tMs: number) {
  'worklet';
  if (tMs >= SWIRL_MS) return 5;
  return Math.max(5, 0.35 * klumpWidth(tMs));
}

export type Mass = { fraction: number; avg: Rgb };

/** Swallowed share, and the size-weighted colour of what was swallowed. */
export function massIn(
  stimuli: readonly Stimulus[],
  tMs: number,
  width: number,
  height: number,
  limit: number,
): Mass {
  'worklet';
  const model = modelTime(tMs);
  const calmE = calmAt(tMs);
  const swallowR = swallowRadius(tMs);
  const n = Math.min(limit, stimuli.length);
  let swallowed = 0;
  let total = 0;
  let ar = 0;
  let ag = 0;
  let ab = 0;
  let aw = 0;
  for (let i = 0; i < n; i += 1) {
    const item = stimuli[i]!;
    total += 1;
    const pose = sampleStimulus(
      i,
      item.delay,
      item.angle,
      item.r0,
      item.size,
      item.rot0,
      item.flake,
      item.turnU,
      item.shift,
      model,
      width,
      height,
      limit,
      swallowR,
      calmE,
    );
    if (pose[1] === 1) {
      swallowed += 1;
      ar += item.rgb[0] * item.size;
      ag += item.rgb[1] * item.size;
      ab += item.rgb[2] * item.size;
      aw += item.size;
    }
  }
  const fraction = total > 0 ? swallowed / total : 1;
  const avg: Rgb = aw > 0 ? [ar / aw, ag / aw, ab / aw] : INK_RGB;
  return { fraction, avg };
}

function mixChannel(from: number, to: number, t: number) {
  'worklet';
  return Math.round(from + (to - from) * clamp01(t));
}

/**
 * Dot, glide and the «bored» reveal.
 * At rest the numbers are the static S6 mark: the dot sits on the period,
 * not at the screen centre.
 */
export function logoPose(tMs: number, swallowedFraction: number, avg: Rgb, colorMix = false): LogoPose {
  'worklet';
  const calmE = calmAt(tMs);
  const kw = klumpWidth(tMs);
  const glide = cubicBezierY(0.22, 1, 0.36, 1, clamp01((tMs - GLIDE_AT) / GLIDE_MS));
  const dx = S6_DOT_X * glide;
  const dy = S6_DOT_Y * glide;
  const reveal = cubicBezierY(0.2, 0.7, 0.2, 1, clamp01((tMs - REVEAL_AT) / REVEAL_MS));
  const front = lerp(S6_CLIP_R, S6_CLIP_L - SOFT_PT, reveal);
  const clipRight = Math.min(S6_CLIP_R, dx - kw / 2 - 0.3);
  const clipLeft = Math.max(-120, front);
  const tint = K_TINT * (1 - calmE) * smoothstep(0, 0.04, swallowedFraction);
  const show = kw > 0.2;
  // The mixed dot is in the picture. This vector fades in on top of it, then stays solid.
  const sharp = colorMix && tMs < SWIRL_MS ? smoothstep(0.15, 0.85, calmE) : 1;
  return {
    kw: show ? kw : 0,
    dx,
    dy,
    r: mixChannel(INK_RGB[0], avg[0], tint),
    g: mixChannel(INK_RGB[1], avg[1], tint),
    b: mixChannel(INK_RGB[2], avg[2], tint),
    opacity: show ? sharp : 0,
    clipLeft,
    clipRight,
    front,
    settled: tMs >= REST_AT ? 1 : 0,
  };
}

type OutlineBuilder = {
  moveTo(x: number, y: number): void;
  quadTo(c1x: number, c1y: number, x: number, y: number): void;
  close(): void;
};

/** Unit outline, 28 quadratics. Wobble is a radial scale of the baked pebble. */
export function writeOutline(
  builder: OutlineBuilder,
  outline: readonly (readonly [number, number, number])[],
  amp: number,
  phase: number,
) {
  'worklet';
  const n = outline.length;
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < n; i += 1) {
    const p = outline[i]!;
    const f = 1 + amp * Math.sin(3 * p[2] + phase);
    xs.push(p[0] * f);
    ys.push(p[1] * f);
  }
  const last = n - 1;
  builder.moveTo(((xs[last] ?? 0) + (xs[0] ?? 0)) / 2, ((ys[last] ?? 0) + (ys[0] ?? 0)) / 2);
  for (let i = 0; i < n; i += 1) {
    const j = (i + 1) % n;
    builder.quadTo(xs[i] ?? 0, ys[i] ?? 0, ((xs[i] ?? 0) + (xs[j] ?? 0)) / 2, ((ys[i] ?? 0) + (ys[j] ?? 0)) / 2);
  }
  builder.close();
}

export function outlinePhase(modelMs: number, phase: number) {
  'worklet';
  return (9 * modelMs) / 1000 + phase;
}
