/**
 * BD-1 v3 timeline. Port of `_src/bulge_v3.py` `SPEC` + `state(t)`.
 * Times are milliseconds from the moment the session screen is in.
 */

export const LOCK_HINT_DELAY_MS = 4000;
export const LOCK_HINT_EMERGE_MS = 600;
export const LOCK_HINT_OVERLAY_IN_MS = 400;
export const LOCK_HINT_TEXT_IN_AT_MS = 4300;
export const LOCK_HINT_TEXT_IN_MS = 320;
export const LOCK_HINT_GLOW_START_MS = 8000;
export const LOCK_HINT_GLOW_END_MS = 19000;
export const LOCK_HINT_TEXT_OUT_AT_MS = 33700;
export const LOCK_HINT_TEXT_OUT_MS = 300;
export const LOCK_HINT_RETRACT_AT_MS = 34000;
export const LOCK_HINT_RETRACT_MS = 500;
export const LOCK_HINT_OVERLAY_OUT_AT_MS = 34000;
export const LOCK_HINT_OVERLAY_OUT_MS = 400;
export const LOCK_HINT_TAP_TEXT_MS = 150;
export const LOCK_HINT_TAP_RETRACT_MS = 350;
export const LOCK_HINT_TAP_OVERLAY_MS = 300;
export const LOCK_HINT_BREATH_MS = 3000;
export const LOCK_HINT_REDUCE_MOTION_MS = 200;

/** Resting depth, and the extra depth at the top of a breath. */
export const BULGE_DEPTH_PT = 5.5;
export const BULGE_BREATH_DEPTH = 0.18;
export const BULGE_BREATH_LENGTH = 0.04;
export const BULGE_CORE_LEN_PT = 56;
export const BULGE_MENISCUS_PT = 18;
/** Right inset of the hint: max depth (5.5 × 1.18) plus the 18 pt gap. */
export const LOCK_HINT_TEXT_RIGHT_PT = BULGE_DEPTH_PT * (1 + BULGE_BREATH_DEPTH) + 18;

export const BULGE_MATTE_ALPHA = 0.42;
export const BULGE_CORE_ALPHA = 0.9;
export const BULGE_GLOW_ALPHA = 0.55;
export const BULGE_GLOW_RADIUS_PT = 9;
export const BULGE_RIM_ALPHA = 0.3;
export const BULGE_RIM_SIGMA_PT = 60;

/** Near-black scrim. #111110 is lighter than the session ground and reads as grey. */
export const LOCK_HINT_OVERLAY = '#050504';
export const LOCK_HINT_OVERLAY_LEFT = 0.72;
export const LOCK_HINT_OVERLAY_RIGHT = 0.58;
export const LOCK_HINT_OVERLAY_CONTRAST = 0.85;

export type LockHintFrame = {
  /** Extension of the bulge, 0–1. Breath is separate. */
  p: number;
  /** Opacity of the silhouette. Reaches 1 early in the emerge. */
  vis: number;
  /** 0–1 on the 3 s breath. 0 while reduce motion is on. */
  breath: number;
  /** Glow ramp, 0 at 8 s and 1 at 19 s. Already ×0.6 when reduce motion is on. */
  g: number;
  /** False for Increase Contrast / Reduce Transparency: solid paper, no glow. */
  glowOn: boolean;
  /** Overlay strength, 0–1. Multiply by the scrim alphas. */
  ov: number;
  textA: number;
  /** Horizontal slide in points. Negative starts the hint further from the button. */
  textDx: number;
};

function clamp01(x: number): number {
  'worklet';
  return Math.min(1, Math.max(0, x));
}

function easeOutCubic(x: number): number {
  'worklet';
  const t = clamp01(x);
  return 1 - (1 - t) ** 3;
}

function easeInCubic(x: number): number {
  'worklet';
  const t = clamp01(x);
  return t * t * t;
}

function easeInQuad(x: number): number {
  'worklet';
  const t = clamp01(x);
  return t * t;
}

function easeIOSine(x: number): number {
  'worklet';
  return 0.5 - 0.5 * Math.cos(Math.PI * clamp01(x));
}

/**
 * Depth of the bulge at `y`, in points, measured in from the right edge.
 * Profile is `D · exp(-(u/σ)⁶)`, the same curve as the v3 render.
 */
export function bulgeDepth(y: number, centerY: number, p: number, breath: number): number {
  'worklet';
  if (p <= 0) return 0;
  const length = (0.55 + 0.45 * p) * (1 + BULGE_BREATH_LENGTH * breath);
  const halfCore = (BULGE_CORE_LEN_PT / 2) * length;
  const meniscus = BULGE_MENISCUS_PT * length;
  const sigma = (halfCore + meniscus / 2) / Math.log(2) ** (1 / 6);
  const along = Math.abs(y - centerY);
  const shaped = Math.exp(-((along / sigma) ** 6));
  const kept = shaped > 0.004 ? shaped : 0;
  const depth = BULGE_DEPTH_PT * p * (1 + BULGE_BREATH_DEPTH * breath);
  return depth * kept;
}

/**
 * `tap` is the millisecond the screen was tapped, or null.
 * `hold` keeps the hint up (VoiceOver): no auto retract, tap still closes it.
 */
export function lockHintState(
  t: number,
  reduceMotion: boolean,
  contrast: boolean,
  tap: number | null,
  hold: boolean,
): LockHintFrame {
  'worklet';
  const glowSpan = LOCK_HINT_GLOW_END_MS - LOCK_HINT_GLOW_START_MS;
  const g = easeInQuad((t - LOCK_HINT_GLOW_START_MS) / glowSpan);
  let textOut = hold ? 0 : clamp01((t - LOCK_HINT_TEXT_OUT_AT_MS) / LOCK_HINT_TEXT_OUT_MS);
  const overlayIn = easeIOSine((t - LOCK_HINT_DELAY_MS) / LOCK_HINT_OVERLAY_IN_MS);
  const overlayOut = hold ? 0 : easeIOSine((t - LOCK_HINT_OVERLAY_OUT_AT_MS) / LOCK_HINT_OVERLAY_OUT_MS);
  let ov = overlayIn * (1 - overlayOut);
  if (tap != null && t >= tap) {
    textOut = Math.max(textOut, clamp01((t - tap) / LOCK_HINT_TAP_TEXT_MS));
    ov *= 1 - easeIOSine((t - tap) / LOCK_HINT_TAP_OVERLAY_MS);
  }
  const tapScale = tap != null && t >= tap ? 1 - easeInCubic((t - tap) / LOCK_HINT_TAP_RETRACT_MS) : 1;
  const glowOn = !contrast;

  if (reduceMotion) {
    const fadeOut = hold ? 0 : clamp01((t - LOCK_HINT_RETRACT_AT_MS) / LOCK_HINT_REDUCE_MOTION_MS);
    let appear = clamp01((t - LOCK_HINT_DELAY_MS) / LOCK_HINT_REDUCE_MOTION_MS) * (1 - fadeOut);
    if (tap != null && t >= tap) appear *= 1 - clamp01((t - tap) / LOCK_HINT_REDUCE_MOTION_MS);
    const textIn = clamp01((t - LOCK_HINT_TEXT_IN_AT_MS) / LOCK_HINT_REDUCE_MOTION_MS);
    return {
      p: appear > 0 ? 1 : 0,
      vis: appear,
      breath: 0,
      g: g * 0.6,
      glowOn,
      ov,
      textA: textIn * (1 - textOut),
      textDx: 0,
    };
  }

  const emerge = easeOutCubic((t - LOCK_HINT_DELAY_MS) / LOCK_HINT_EMERGE_MS);
  const retract = hold ? 0 : easeInCubic((t - LOCK_HINT_RETRACT_AT_MS) / LOCK_HINT_RETRACT_MS);
  const p = emerge * (1 - retract) * tapScale;
  const sinceFull = Math.max(0, t - (LOCK_HINT_DELAY_MS + LOCK_HINT_EMERGE_MS));
  const breath = 0.5 * (1 - Math.cos((2 * Math.PI * sinceFull) / LOCK_HINT_BREATH_MS));
  const textIn = easeOutCubic((t - LOCK_HINT_TEXT_IN_AT_MS) / LOCK_HINT_TEXT_IN_MS);
  return {
    p,
    vis: clamp01(p * 2.5),
    breath,
    g,
    glowOn,
    ov,
    textA: textIn * (1 - textOut),
    textDx: -8 * (1 - textIn),
  };
}

/** True once the retract (or the tap) has finished and nothing is left on screen. */
export function lockHintSettled(t: number, frame: LockHintFrame, tap: number | null, hold: boolean): boolean {
  'worklet';
  if (hold || t < LOCK_HINT_DELAY_MS) return false;
  const tapDone =
    tap != null && t >= tap + Math.max(LOCK_HINT_TAP_RETRACT_MS, LOCK_HINT_TAP_OVERLAY_MS, LOCK_HINT_TAP_TEXT_MS);
  const timelineDone = t >= LOCK_HINT_RETRACT_AT_MS + Math.max(LOCK_HINT_RETRACT_MS, LOCK_HINT_OVERLAY_OUT_MS);
  if (!tapDone && !timelineDone) return false;
  return frame.p < 0.01 && frame.ov < 0.01 && frame.textA < 0.01;
}

/** «gjenstår» yields as the scrim comes in, and is gone once the scrim is half way. */
export function remainingLabelOpacity(overlay: number): number {
  'worklet';
  return 1 - clamp01(overlay / 0.5);
}
