import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Appearance, useColorScheme } from 'react-native';

import { getSetting, setSetting, THEME_PREFERENCE_KEY } from '@/data/repository';
import {
  activeAppearance,
  asColorScheme,
  resolvedThemeName,
  type ColorScheme,
} from '@/theme/appearancePreview';
import {
  DEFAULT_THEME_PREFERENCE,
  themes,
  type Theme,
  type ThemePreference,
} from '@/theme/theme';

type ThemeContextValue = {
  theme: Theme;
  /** Saved preference. This is what Deg shows and what survives a relaunch. */
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => Promise<void>;
  /** Paints the whole app with this preference. Does not write storage. */
  previewPreference: (preference: ThemePreference) => void;
  /** Drops the preview. The saved preference paints again. */
  revertPreview: () => void;
  /** Drops the in-memory choice back to Automatisk. Storage is wiped separately. */
  forgetPreference: () => void;
  ready: boolean;
};

const Ctx = createContext<ThemeContextValue | null>(null);
const Override = createContext<Theme | null>(null);

function isPreference(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>(DEFAULT_THEME_PREFERENCE);
  const [preview, setPreview] = useState<ThemePreference | null>(null);
  const [ready, setReady] = useState(false);
  /** Preference last sent to Appearance.setColorScheme. One frame behind the render. */
  const appliedRef = useRef<ThemePreference>(DEFAULT_THEME_PREFERENCE);
  const memoryRef = useRef<ColorScheme | null>(asColorScheme(Appearance.getColorScheme()));

  useEffect(() => {
    let cancelled = false;
    getSetting(THEME_PREFERENCE_KEY)
      .then((stored) => {
        if (cancelled) return;
        if (isPreference(stored)) setPreferenceState(stored);
      })
      .catch(() => {
        // Theme stays on the default (Automatisk) if storage is not readable yet.
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const active = activeAppearance({ saved: preference, preview });
  const resolved = resolvedThemeName(
    { saved: preference, preview },
    appliedRef.current,
    asColorScheme(system),
    memoryRef.current,
  );
  memoryRef.current = resolved.remembered;
  const theme = themes[resolved.name];

  useEffect(() => {
    appliedRef.current = active;
    Appearance.setColorScheme(active === 'system' ? 'unspecified' : active);
  }, [active]);

  const setPreference = useCallback(async (next: ThemePreference) => {
    setPreferenceState(next);
    setPreview((current) => (current === null ? current : null));
    await setSetting(THEME_PREFERENCE_KEY, next);
  }, []);

  const previewPreference = useCallback((next: ThemePreference) => {
    setPreview((current) => (current === next ? current : next));
  }, []);

  const revertPreview = useCallback(() => {
    setPreview((current) => (current === null ? current : null));
  }, []);

  const forgetPreference = useCallback(() => {
    setPreferenceState(DEFAULT_THEME_PREFERENCE);
    setPreview((current) => (current === null ? current : null));
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      preference,
      setPreference,
      previewPreference,
      revertPreview,
      forgetPreference,
      ready,
    }),
    [theme, preference, setPreference, previewPreference, revertPreview, forgetPreference, ready],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Sheet chrome keeps this theme while the app underneath reverts. */
export function ThemeOverride({ theme, children }: { theme: Theme; children: ReactNode }) {
  return <Override.Provider value={theme}>{children}</Override.Provider>;
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  const override = useContext(Override);
  if (!override) return ctx;
  return { ...ctx, theme: override };
}
