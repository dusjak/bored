import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import {
  MOCK_SESSIONS,
  MOCK_STATS,
  type Mood,
  type OnboardingData,
  type SessionEntry,
} from '@/data/mock';

/**
 * In-memory app state.
 * TODO: persist (e.g. AsyncStorage/SQLite) and sync with a backend. Everything resets on reload.
 */
type AppState = {
  user: OnboardingData;
  updateUser: (patch: Partial<OnboardingData>) => void;
  onboarded: boolean;
  completeOnboarding: () => void;
  resetOnboarding: () => void;

  /** Duration chosen on Home (minutes). */
  activeDuration: number;
  setActiveDuration: (minutes: number) => void;

  sessions: SessionEntry[];
  addSession: (entry: { minutes: number; mood: Mood | null; note: string }) => void;

  stats: {
    streakDays: number;
    recordStreak: number;
    totalSessions: number;
    avgMinutes: number;
    weekMinutes: number;
    /** Minutes per weekday, Monday first. */
    week: number[];
  };
};

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<OnboardingData>({});
  const [onboarded, setOnboarded] = useState(false);
  const [activeDuration, setActiveDuration] = useState(10);
  const [sessions, setSessions] = useState<SessionEntry[]>(MOCK_SESSIONS);

  const updateUser = useCallback((patch: Partial<OnboardingData>) => {
    setUser((u) => ({ ...u, ...patch }));
    if (patch.duration) setActiveDuration(parseInt(patch.duration, 10));
  }, []);

  const addSession = useCallback<AppState['addSession']>((entry) => {
    setSessions((s) => [{ id: `s${Date.now()}`, date: new Date(), ...entry }, ...s]);
  }, []);

  const stats = useMemo(() => {
    // TODO: real streak calculation. Mock: base streak, +1 if there's a new session today.
    const now = new Date();
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
    const week = [0, 0, 0, 0, 0, 0, 0];
    for (const s of sessions) {
      if (s.date >= monday) week[(s.date.getDay() + 6) % 7] += s.minutes;
    }
    const total = sessions.reduce((sum, s) => sum + s.minutes, 0);
    const newToday = sessions.some((s) => !MOCK_SESSIONS.includes(s));
    return {
      streakDays: MOCK_STATS.streakDays + (newToday ? 1 : 0),
      recordStreak: MOCK_STATS.recordStreak,
      totalSessions: MOCK_STATS.historicSessions + sessions.length,
      avgMinutes: Math.round(total / Math.max(1, sessions.length)),
      weekMinutes: week.reduce((a, b) => a + b, 0),
      week,
    };
  }, [sessions]);

  const value = useMemo<AppState>(
    () => ({
      user,
      updateUser,
      onboarded,
      completeOnboarding: () => setOnboarded(true),
      resetOnboarding: () => {
        setUser({});
        setOnboarded(false);
      },
      activeDuration,
      setActiveDuration,
      sessions,
      addSession,
      stats,
    }),
    [user, updateUser, onboarded, activeDuration, sessions, addSession, stats],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppState must be used inside AppStateProvider');
  return ctx;
}
