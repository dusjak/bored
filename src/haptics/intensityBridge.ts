/**
 * Numeric transient haptic. Intensity and sharpness stay 0–1.
 * This does not pick an Expo impact style and it does not pulse to fake a level.
 * Nothing in the hold, the tabs, or onboarding calls it yet.
 */

export type TransientHaptic = {
  intensity: number;
  sharpness: number;
};

export type HapticIntensityNative = {
  playTransient: (intensity: number, sharpness: number) => boolean;
};

export function clampUnit(value: number): number | null {
  if (!Number.isFinite(value)) return null;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/** Rejects a non-numeric request. Does not snap 0.13 or 0.20 onto a named style. */
export function transientHaptic(intensity: number, sharpness: number): TransientHaptic | null {
  const clampedIntensity = clampUnit(intensity);
  const clampedSharpness = clampUnit(sharpness);
  if (clampedIntensity == null || clampedSharpness == null) return null;
  return { intensity: clampedIntensity, sharpness: clampedSharpness };
}

/**
 * Plays one transient through the iOS module.
 * A missing module, a rejected request, or a native failure returns false.
 * There is no second pulse and no style fallback.
 */
export function playTransientHaptic(
  native: HapticIntensityNative | null | undefined,
  intensity: number,
  sharpness: number,
): boolean {
  const request = transientHaptic(intensity, sharpness);
  if (!request || !native || typeof native.playTransient !== 'function') return false;
  try {
    return native.playTransient(request.intensity, request.sharpness) === true;
  } catch {
    return false;
  }
}
