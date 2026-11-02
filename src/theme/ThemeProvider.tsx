import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance, useColorScheme } from 'react-native';

import { getSetting, setSetting, THEME_PREFERENCE_KEY } from '@/data/repository';
import {
  DEFAULT_THEME_PREFERENCE,
  resolveThemeName,
  themes,
  type Theme,
  type ThemePreference,
} from '@/theme/theme';

type ThemeContextValue = {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => Promise<void>;
  /** Drops the in-memory choice back to Automatisk. Storage is wiped separately. */
  forgetPreference: () => void;
  ready: boolean;
};

const Ctx = createContext<ThemeContextValue | null>(null);

function isPreference(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>(DEFAULT_THEME_PREFERENCE);
  const [ready, setReady] = useState(false);

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

  useEffect(() => {
    Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
  }, [preference]);

  const setPreference = useCallback(async (next: ThemePreference) => {
    setPreferenceState(next);
    await setSetting(THEME_PREFERENCE_KEY, next);
  }, []);

  const forgetPreference = useCallback(() => {
    setPreferenceState(DEFAULT_THEME_PREFERENCE);
  }, []);

  const scheme = system === 'dark' || system === 'light' ? system : null;
  const theme = themes[resolveThemeName(preference, scheme)];

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, preference, setPreference, forgetPreference, ready }),
    [theme, preference, setPreference, forgetPreference, ready],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
