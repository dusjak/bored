import { resolveThemeName, type ThemeName, type ThemePreference } from './theme.ts';

export type ColorScheme = 'light' | 'dark';

/**
 * Saved is what storage holds. Preview is the in-memory sheet pick.
 * A null preview means the sheet is not overriding anything.
 */
export type AppearanceState = {
  saved: ThemePreference;
  preview: ThemePreference | null;
};

export function asColorScheme(value: string | null | undefined): ColorScheme | null {
  return value === 'light' || value === 'dark' ? value : null;
}

/** What the UI paints. The sheet check follows this too. */
export function activeAppearance(state: AppearanceState): ThemePreference {
  return state.preview ?? state.saved;
}

/** What a relaunch would read. A preview is never this value. */
export function persistedAppearance(state: AppearanceState): ThemePreference {
  return state.saved;
}

/** Tapping Lys, Mørk, or Automatisk. Storage stays put. */
export function previewAppearance(state: AppearanceState, pick: ThemePreference): AppearanceState {
  return { saved: state.saved, preview: pick };
}

/** Drag down, tap outside, or back. The saved preference returns. */
export function revertAppearance(state: AppearanceState): AppearanceState {
  return { saved: state.saved, preview: null };
}

/** «Velg». The current pick becomes the saved preference. */
export function commitAppearance(state: AppearanceState): AppearanceState {
  return { saved: activeAppearance(state), preview: null };
}

/**
 * useColorScheme echoes Appearance.setColorScheme while light or dark is forced.
 * Keep the last scheme seen while nothing was forced, and do not replace it
 * with that echo.
 */
export function rememberPhoneScheme(
  applied: ThemePreference,
  reported: ColorScheme | null,
  remembered: ColorScheme | null,
): ColorScheme | null {
  if (applied !== 'system') return remembered;
  if (reported === 'light' || reported === 'dark') return reported;
  return remembered;
}

/**
 * Scheme to give resolveThemeName.
 * On the revert frame, `applied` is still the forced value and `reported`
 * still echoes it. Use the remembered phone scheme so Automatisk does not
 * flash the preview color.
 */
export function phoneScheme(input: {
  applied: ThemePreference;
  reported: ColorScheme | null;
  remembered: ColorScheme | null;
}): ColorScheme | null {
  if (input.applied !== 'system') return input.remembered;
  return input.reported ?? input.remembered;
}

export function resolvedThemeName(
  state: AppearanceState,
  applied: ThemePreference,
  reported: ColorScheme | null,
  remembered: ColorScheme | null,
): { name: ThemeName; remembered: ColorScheme | null } {
  const memory = rememberPhoneScheme(applied, reported, remembered);
  return {
    name: resolveThemeName(activeAppearance(state), phoneScheme({ applied, reported, remembered: memory })),
    remembered: memory,
  };
}
