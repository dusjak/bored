/**
 * «Sluket» timeline. Pure so the motion can be tested.
 * Not imported on launch while features.sluketAnimation is false.
 * Crash notes live on src/components/SluketPlay.tsx. Do not mount that component.
 */

export const SPLASH_MS = 2000;
export const HANDOVER_AT = 1850;
export const HANDOVER_MS = 150;
/** Keep in step with src/splash/splashTiming.ts. That file is what the still splash imports. */
export const REDUCE_HOLD_MS = 600;
export const REDUCE_FADE_MS = 200;

const DRIFT_START = 100;
const DRIFT_END = 600;
const SPIRAL_END = 1150;
const WORD_AT = 1300;
const WORD_DONE = 1550;
const HOLE_RADIUS = 5;
const MAX_DRIFT = (30 * Math.PI) / 180;

export const STIMULUS_COUNT = 60;
export const SPLASH_SEED = 0xb0ed;

/** iOS system colours. Same in Lys and Mørk. */
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
  color: Rgb;
  /** 0–300 ms, added to the drift start. */
  delay: number;
  /** Position angle at the start of the drift. */
  angle: number;
  spin: 1 | -1;
  /** Drift rotation, at most 30°. The spiral adds three times this, capped at one turn. */
  drift: number;
  /** Start radius as a fraction of the screen diagonal (0.6–0.8, off screen). */
  r0: number;
  /** Radius fraction when the spiral begins. */
  r1: number;
  /** Badge diameter, or the squircle side, in px. Pills are 28×10. */
  size: number;
};

export type StimulusPose = {
  x: number;
  y: number;
  rotation: number;
  scale: number;
  stretch: number;
  color: Rgb;
};

export function parseHex(hex: string): Rgb {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function rgbToHex(color: Rgb): string {
  'worklet';
  const channel = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${channel(color[0])}${channel(color[1])}${channel(color[2])}`;
}

export function mixRgb(from: Rgb, to: Rgb, t: number): Rgb {
  'worklet';
  return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, from[2] + (to[2] - from[2]) * t];
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

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Extra spiral angle. Three times the drift, and the whole trip stays within one turn.
 * This is a plain function. sampleStimulus calls it from a worklet once t >= 600.
 * See the crash note on SluketPlay.
 */
export function spiralAngle(drift: number) {
  return Math.min(drift * 3, Math.PI * 2 - drift);
}

export function createStimuli(seed = SPLASH_SEED): Stimulus[] {
  const rand = mulberry32(seed);
  const stimuli: Stimulus[] = [];
  for (let i = 0; i < STIMULUS_COUNT; i += 1) {
    const kind: StimulusKind = i < 36 ? 'badge' : i < 54 ? 'pill' : 'squircle';
    stimuli.push({
      kind,
      color: NOISE_RGB[i % NOISE_RGB.length]!,
      delay: rand() * 300,
      angle: rand() * Math.PI * 2,
      spin: rand() < 0.5 ? -1 : 1,
      drift: (0.35 + rand() * 0.65) * MAX_DRIFT,
      r0: 0.6 + rand() * 0.2,
      r1: 0.16 + rand() * 0.12,
      size: kind === 'badge' ? 6 + rand() * 8 : 14,
    });
  }
  return stimuli;
}

/**
 * Pose of one stimulus, or null once it has been swallowed.
 * The last 30% of the spiral blends toward `hole` so the noise disappears into the period.
 */
export function sampleStimulus(
  stimulus: Stimulus,
  tMs: number,
  width: number,
  height: number,
  hole: Rgb,
): StimulusPose | null {
  'worklet';
  const start = DRIFT_START + stimulus.delay;
  if (tMs < start || tMs >= SPIRAL_END) return null;
  const diagonal = Math.hypot(width, height);
  let radius: number;
  let turned: number;
  let scale = 1;
  let stretch = 1;
  let mix = 0;
  if (tMs < DRIFT_END) {
    const eased = cubicBezierY(0.25, 0.1, 0.25, 1, clamp01((tMs - start) / Math.max(1, DRIFT_END - start)));
    radius = lerp(stimulus.r0 * diagonal, stimulus.r1 * diagonal, eased);
    turned = stimulus.drift * eased;
  } else {
    const eased = cubicBezierY(0.55, 0, 1, 0.45, clamp01((tMs - DRIFT_END) / (SPIRAL_END - DRIFT_END)));
    radius = lerp(stimulus.r1 * diagonal, HOLE_RADIUS, eased);
    turned = stimulus.drift + spiralAngle(stimulus.drift) * eased;
    scale = lerp(1, 0.1, eased);
    stretch = lerp(1, 2.5, eased);
    if (eased > 0.7) mix = (eased - 0.7) / 0.3;
  }
  const angle = stimulus.angle + stimulus.spin * turned;
  return {
    x: width / 2 + Math.cos(angle) * radius,
    y: height / 2 + Math.sin(angle) * radius,
    rotation: angle + stimulus.spin * (Math.PI / 2),
    scale,
    stretch,
    color: mixRgb(stimulus.color, hole, mix),
  };
}

/** Period scale. Appears with a spring, gulps once, then shrinks away on the handover. */
export function periodScale(tMs: number) {
  'worklet';
  let scale = springAt(tMs / 1000, 0, 1, 18, 320, 0.6);
  if (tMs >= SPIRAL_END) scale = springAt((tMs - SPIRAL_END) / 1000, 1.35, 1, 12, 300, 0.6);
  if (tMs >= HANDOVER_AT) {
    const eased = cubicBezierY(0.55, 0, 1, 0.45, clamp01((tMs - HANDOVER_AT) / HANDOVER_MS));
    scale *= 1 - eased;
  }
  return Math.max(0, scale);
}

/**
 * 0 hides «bored», 1 shows it.
 * Reveals right-to-left out of the period, then reverses on the handover.
 */
export function wordReveal(tMs: number) {
  'worklet';
  if (tMs < WORD_AT) return 0;
  if (tMs < WORD_DONE) return cubicBezierY(0.22, 1, 0.36, 1, clamp01((tMs - WORD_AT) / (WORD_DONE - WORD_AT)));
  if (tMs < HANDOVER_AT) return 1;
  return 1 - cubicBezierY(0.55, 0, 1, 0.45, clamp01((tMs - HANDOVER_AT) / HANDOVER_MS));
}
