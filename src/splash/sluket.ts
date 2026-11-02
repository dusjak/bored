/**
 * «Sluket» v4 timeline. Pure numbers, so the motion can be tested without Skia.
 * The draw loop is the v4 testbench (engine v3): shapes become the dot, the dot
 * glides to the logo, then «bored» reveals from the right. Always dark.
 * Functions called from the UI thread are marked 'worklet'.
 */
export const SPLASH_BG = '#111110';
export const SPLASH_INK = '#F8F6F2';
export const INK_RGB = [0xf8, 0xf6, 0xf2] as const;

export const SPLASH_MS = 6000;
export const SETTLE_MS = 250;
export const GLIDE_MS = 450;
export const REVEAL_MS = 500;
export const REST_HOLD_MS = 300;
export const REVEAL_LEAD = 0.4;
export const SOFT_PT = 28;
/** Swirl length. 6000 − (250 + max(450, 0.4·450 + 500) + 300). */
export const SWIRL_MS = 4770;
export const GLIDE_AT = SWIRL_MS + SETTLE_MS;
export const REVEAL_AT = GLIDE_AT + REVEAL_LEAD * GLIDE_MS;
export const REST_AT = GLIDE_AT + Math.max(GLIDE_MS, REVEAL_LEAD * GLIDE_MS + REVEAL_MS);

export const STIMULUS_COUNT = 160;
export const LOW_POWER_COUNT = 64;
export const WOBBLE_SCALE = 1.6;
export const GOO_SCALE = 0.5;
export const EASE_K = 1.1;
export const MAX_TURNS = 2.5;
export const SPLASH_SEED = 0xb0ed ^ 0x2222;

export const DOT_CX = 62.24;
export const DOT_CY = 0.31;
export const WORD_CLIP_RIGHT = 57.5;
export const WORD_CLIP_LEFT = -80;

export const MIX_START = 0.85;
export const MIX_END = 0;
export const MIX_EXP = 3;
export const MIX_FROM = 0.25;
export const MIX_TO = 0.99;
export const MIX_RADIUS_START = 13;
export const MIX_RADIUS_END = 40;

/** iOS system colours. Red is one of eight, so exactly 1/8 of the shapes. */
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

export type Stimulus = {
  size: number;
  /** Start radius as a fraction of the screen diagonal. */
  r0: number;
  angle: number;
  kind: number;
  hex: string;
  phase: number;
  rot0: number;
  flake: number;
  /** Share of the max revolutions, 0.8–1. */
  turnU: number;
  delay: number;
  /** Nearest shapes finish first. Added to the legacy clock, 0–150 ms. */
  shift: number;
};

const NP = 28;
const PILL_R = 1 / 2.6 / 2;

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

/** Integrated spin weight from the v2 clock, normalised so gAt(1250) is 1. */
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

function gAt(legacyMs: number) {
  'worklet';
  if (legacyMs <= 380) return 0;
  if (legacyMs >= 1250) return 1;
  return SPIN[Math.round(legacyMs - 380)] ?? 1;
}

/** v2 clock. The 120–1250 ms shape timeline is stretched over 0–4770 ms. */
export function legacyTime(tMs: number) {
  'worklet';
  if (tMs <= 0) return 120;
  if (tMs >= SWIRL_MS) return 1250;
  return 120 + (tMs / SWIRL_MS) * 1130;
}

/**
 * Paint-mix amount and radius. u = t / 4770.
 * x = clamp((u − 0.25) / 0.74), e = x³, m = 0.85·(1−e), radius = 13 + 27·e.
 */
export function mixAt(tMs: number) {
  'worklet';
  const u = tMs / SWIRL_MS;
  const x = clamp01((u - MIX_FROM) / (MIX_TO - MIX_FROM));
  const e = Math.pow(x, MIX_EXP);
  return {
    m: MIX_START * (1 - e) + MIX_END * e,
    radius: MIX_RADIUS_START + (MIX_RADIUS_END - MIX_RADIUS_START) * e,
  };
}

/** Mixing pass is one flag, and Low Power Mode forces it off. */
export function colorMixEnabled(flag: boolean, lowPower: boolean) {
  return flag && !lowPower;
}

export function phaseName(tMs: number) {
  const legacy = legacyTime(tMs);
  if (tMs < SWIRL_MS) {
    if (legacy < 380) return 'flood';
    if (legacy < 800) return 'swirl';
    if (legacy < 1100) return 'tighten';
    return 'swallow';
  }
  if (tMs < GLIDE_AT) return 'settle';
  if (tMs < REVEAL_AT) return 'glide';
  if (tMs < REST_AT) return 'reveal';
  if (tMs < SPLASH_MS) return 'rest';
  return 'done';
}

function wobbleAmp(legacyMs: number) {
  'worklet';
  let amp = 0.22;
  if (legacyMs < 380) amp = 0.04;
  else if (legacyMs < 800) amp = lerp(0.04, 0.16, (legacyMs - 380) / 420);
  else if (legacyMs < 1100) amp = lerp(0.16, 0.22, (legacyMs - 800) / 300);
  return amp * WOBBLE_SCALE;
}

export function gooSigma(legacyMs: number) {
  'worklet';
  let sigma = 12;
  if (legacyMs < 380) sigma = 4;
  else if (legacyMs < 800) sigma = lerp(4, 10, (legacyMs - 380) / 420);
  else if (legacyMs < 1100) sigma = lerp(10, 12, (legacyMs - 800) / 300);
  return sigma * GOO_SCALE;
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

export function createStimuli(count = STIMULUS_COUNT, seed = SPLASH_SEED): Stimulus[] {
  const rand = mulberry32(seed);
  const list: Stimulus[] = [];
  for (let i = 0; i < count; i += 1) {
    const roll = i % 10;
    list.push({
      size: 24 + 466 * rand() ** 3.5,
      r0: 0.15 + 0.6 * rand() ** 1.2,
      angle: rand() * Math.PI * 2,
      kind: roll < 5 ? 0 : roll < 8 ? 1 : 2,
      hex: NOISE_HEX[i % NOISE_HEX.length]!,
      phase: rand() * Math.PI * 2,
      rot0: rand() * Math.PI,
      flake: 2 + 18 * rand(),
      turnU: 0.8 + 0.2 * rand(),
      delay: 0,
      shift: 0,
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
  return bySize.map((index) => list[index]!);
}

/**
 * One shape on the v2 clock.
 * [visible, swallowed, x, y, tan, scaleX, scaleY, own, size, inkMix]
 * swallowed is 1 once the shape has entered the hole and is no longer drawn.
 */
export function sampleStimulus(
  index: number,
  delay: number,
  angle: number,
  r0: number,
  size: number,
  phase: number,
  rot0: number,
  flake: number,
  turnU: number,
  shift: number,
  legacyMs: number,
  width: number,
  height: number,
  lowPower: number,
) {
  'worklet';
  const hidden = [0, 0, 0, 0, 0, 1, 1, 0, 0, 0] as const;
  if (lowPower === 1 && index >= LOW_POWER_COUNT) return hidden;
  if (legacyMs < 120 + delay) return hidden;
  const pop = Math.max(0, springAt((legacyMs - 120 - delay) / 1000, 0, 1, 14, 380, 0.6));
  const te = legacyMs < 380 ? legacyMs : 380 + ((legacyMs - 380) * 870) / (870 - shift);
  if (te >= 1250) return [0, 1, 0, 0, 0, 1, 1, 0, 0, 0] as const;
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
  if (te > 800 && dist < 5) return [0, 1, 0, 0, 0, 1, 1, 0, 0, 0] as const;
  const th = angle + turnU * MAX_TURNS * Math.PI * 2 * gAt(te);
  const stretch = smoothstep(0.6, 1, 1 - rf);
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
    smoothstep(0.4, 1, 1 - rf),
  ] as const;
}

export function massIn(stimuli: readonly Stimulus[], legacyMs: number, width: number, height: number, lowPower: number) {
  'worklet';
  let swallowed = 0;
  let total = 0;
  for (let i = 0; i < stimuli.length; i += 1) {
    if (lowPower === 1 && i >= LOW_POWER_COUNT) break;
    total += 1;
    const item = stimuli[i]!;
    const pose = sampleStimulus(
      i,
      item.delay,
      item.angle,
      item.r0,
      item.size,
      item.phase,
      item.rot0,
      item.flake,
      item.turnU,
      item.shift,
      legacyMs,
      width,
      height,
      lowPower,
    );
    swallowed += pose[1];
  }
  return total > 0 ? swallowed / total : 1;
}

export type MarkPose = {
  circleR: number;
  showCircle: boolean;
  glyphA: number;
  glyphS: number;
  dx: number;
  dy: number;
  front: number;
  clipLeft: number;
  clipRight: number;
  showPng: boolean;
};

/** Dot, glide and the «bored» reveal. massIn is the swallowed fraction. */
export function markPose(tMs: number, swallowedFraction: number): MarkPose {
  'worklet';
  let circleR = 0;
  let glyphA = 0;
  let glyphS = 1;
  let showCircle = true;
  if (tMs < SWIRL_MS) {
    // Testbench: diameter grows with sqrt(swallowed), up to 13.5.
    circleR = (13.5 * Math.sqrt(Math.max(0, swallowedFraction))) / 2;
    if (circleR < 0.3) showCircle = false;
  } else {
    const diameter = springAt((tMs - SWIRL_MS) / 1000, 13.5, 10, 12, 300, 0.6);
    const e = cubicBezierY(0.22, 1, 0.36, 1, clamp01((tMs - SWIRL_MS) / SETTLE_MS));
    circleR = lerp(diameter / 2, 3.8, e);
    glyphA = e;
    glyphS = lerp(diameter / 8.7, 1, e);
    if (e >= 0.999) showCircle = false;
  }
  const glide = cubicBezierY(0.22, 1, 0.36, 1, clamp01((tMs - GLIDE_AT) / GLIDE_MS));
  const dx = DOT_CX * glide;
  const dy = DOT_CY * glide;
  const reveal = cubicBezierY(0.2, 0.7, 0.2, 1, clamp01((tMs - REVEAL_AT) / REVEAL_MS));
  const front = lerp(WORD_CLIP_RIGHT, WORD_CLIP_LEFT - SOFT_PT, reveal);
  const clipRight = Math.min(WORD_CLIP_RIGHT, dx - 4.36 - 0.3);
  const showPng = tMs >= REST_AT && tMs < SPLASH_MS;
  return {
    circleR,
    showCircle: showCircle && !showPng,
    glyphA: showPng ? 0 : glyphA,
    glyphS,
    dx,
    dy,
    front,
    clipLeft: Math.max(-120, front),
    clipRight,
    showPng,
  };
}

function outlinePoint(kind: number, k: number) {
  'worklet';
  const angle = k * Math.PI * 2;
  if (kind === 0) return [0.5 * Math.cos(angle), 0.5 * Math.sin(angle)] as const;
  if (kind === 2) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const sign = (v: number) => (v < 0 ? -1 : 1);
    return [0.5 * sign(c) * Math.pow(Math.abs(c), 0.4), 0.5 * sign(s) * Math.pow(Math.abs(s), 0.4)] as const;
  }
  const r = PILL_R;
  const straight = 0.5 - r;
  const perimeter = 4 * straight + Math.PI * 2 * r;
  let s = (k - Math.floor(k)) * perimeter;
  if (s < 2 * straight) return [-straight + s, -r] as const;
  s -= 2 * straight;
  if (s < Math.PI * r) {
    const a = -Math.PI / 2 + s / r;
    return [straight + r * Math.cos(a), r * Math.sin(a)] as const;
  }
  s -= Math.PI * r;
  if (s < 2 * straight) return [straight - s, r] as const;
  s -= 2 * straight;
  const a = Math.PI / 2 + s / r;
  return [-straight + r * Math.cos(a), r * Math.sin(a)] as const;
}

function wobblePoint(kind: number, index: number, amp: number, phase: number) {
  'worklet';
  const base = outlinePoint(kind, index / NP);
  const angle = Math.atan2(base[1], base[0]);
  const scale = 1 + amp * Math.sin(3 * angle + phase);
  return [base[0] * scale, base[1] * scale] as const;
}

type OutlineBuilder = {
  moveTo(x: number, y: number): void;
  quadTo(c1x: number, c1y: number, x: number, y: number): void;
  close(): void;
};

/** Unit outline, 28 quadratics, wobble included. The view scales and places it. */
export function writeOutline(builder: OutlineBuilder, kind: number, amp: number, phase: number) {
  'worklet';
  const first = wobblePoint(kind, 0, amp, phase);
  const last = wobblePoint(kind, NP - 1, amp, phase);
  builder.moveTo((last[0] + first[0]) / 2, (last[1] + first[1]) / 2);
  for (let i = 0; i < NP; i += 1) {
    const current = i === 0 ? first : wobblePoint(kind, i, amp, phase);
    const next = i === NP - 1 ? first : wobblePoint(kind, i + 1, amp, phase);
    builder.quadTo(current[0], current[1], (current[0] + next[0]) / 2, (current[1] + next[1]) / 2);
  }
  builder.close();
}

export function wobbleAtLegacy(legacyMs: number) {
  'worklet';
  return wobbleAmp(legacyMs);
}
