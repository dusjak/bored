import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { DEFAULT_DURATION_MINUTES } from '@/data/copy';
import {
  cancelSessionNotification,
  ensureSessionNotificationPermission,
  scheduleSessionEndNotification,
} from '@/data/notifications';
import {
  clearBackgrounded,
  deleteJournal,
  DURATION_KEY,
  finishSession,
  getActiveSession,
  getProfile,
  getSetting,
  initDatabase,
  insertActiveSession,
  listFinishedSessions,
  markBackgrounded,
  ONBOARDED_KEY,
  saveProfile,
  setNotificationId,
  setSetting,
  upsertJournal,
} from '@/data/repository';
import { decideUnfinishedSession, elapsedSeconds } from '@/data/sessionRules';
import type { MoodId, OnboardingProfile, SessionRecord, SessionWithJournal } from '@/data/types';

export type LaunchTarget = 'onboarding' | 'home' | 'session' | 'reflection';

type AppStateValue = {
  ready: boolean;
  storageError: string | null;
  launch: LaunchTarget;
  reflectionSessionId: string | null;
  user: OnboardingProfile;
  updateUser: (patch: Partial<OnboardingProfile>) => void;
  onboarded: boolean;
  completeOnboarding: () => Promise<void>;
  durationMinutes: number;
  setDurationMinutes: (minutes: number) => Promise<void>;
  sessions: SessionWithJournal[];
  activeSession: SessionRecord | null;
  beginSession: (minutes: number) => Promise<void>;
  completeActiveSession: () => Promise<string | null>;
  abortActiveSession: () => Promise<string | null>;
  noteBackground: () => Promise<void>;
  noteForeground: () => Promise<void>;
  saveReflection: (sessionId: string, mood: MoodId | null, note: string) => Promise<void>;
  removeReflection: (sessionId: string) => Promise<void>;
};

const Ctx = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [launch, setLaunch] = useState<LaunchTarget>('onboarding');
  const [reflectionSessionId, setReflectionSessionId] = useState<string | null>(null);
  const [user, setUser] = useState<OnboardingProfile>({});
  const [onboarded, setOnboarded] = useState(false);
  const [durationMinutes, setDurationState] = useState(DEFAULT_DURATION_MINUTES);
  const [sessions, setSessions] = useState<SessionWithJournal[]>([]);
  const [activeSession, setActiveSession] = useState<SessionRecord | null>(null);
  const userRef = useRef(user);
  const activeRef = useRef(activeSession);
  userRef.current = user;
  activeRef.current = activeSession;

  const refreshSessions = useCallback(async () => {
    setSessions(await listFinishedSessions());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await initDatabase();
        const [profile, onboardedRaw, durationRaw, finished, active] = await Promise.all([
          getProfile(),
          getSetting(ONBOARDED_KEY),
          getSetting(DURATION_KEY),
          listFinishedSessions(),
          getActiveSession(),
        ]);
        if (cancelled) return;
        setUser(profile);
        const isOnboarded = onboardedRaw === '1';
        setOnboarded(isOnboarded);
        const parsedDuration = durationRaw ? parseInt(durationRaw, 10) : DEFAULT_DURATION_MINUTES;
        const fromProfile = profile.duration ? parseInt(profile.duration, 10) : NaN;
        const initialDuration = Number.isFinite(parsedDuration) && parsedDuration > 0
          ? parsedDuration
          : Number.isFinite(fromProfile) && fromProfile > 0
            ? fromProfile
            : DEFAULT_DURATION_MINUTES;
        setDurationState(initialDuration);
        setSessions(finished);

        if (active) {
          const decision = decideUnfinishedSession({
            nowMs: Date.now(),
            startedAtMs: Date.parse(active.startedAt),
            chosenDurationSeconds: active.chosenDurationSeconds,
            backgroundedAtMs: active.backgroundedAt ? Date.parse(active.backgroundedAt) : null,
            returnKind: 'cold-start',
          });
          if (decision.kind === 'aborted') {
            await cancelSessionNotification(active.notificationId);
            await finishSession(active.id, 'aborted', decision.actualDurationSeconds, new Date(decision.endedAtMs));
            if (cancelled) return;
            setActiveSession(null);
            setReflectionSessionId(active.id);
            setLaunch('reflection');
            setSessions(await listFinishedSessions());
          } else {
            setActiveSession(active);
            setLaunch('session');
          }
        } else {
          setLaunch(isOnboarded ? 'home' : 'onboarding');
        }
      } catch {
        if (!cancelled) setStorageError('noe gikk galt. prøv igjen.');
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateUser = useCallback((patch: Partial<OnboardingProfile>) => {
    setUser((current) => ({ ...current, ...patch }));
  }, []);

  const setDurationMinutes = useCallback(async (minutes: number) => {
    setDurationState(minutes);
    await setSetting(DURATION_KEY, String(minutes));
  }, []);

  const completeOnboarding = useCallback(async () => {
    const profile = userRef.current;
    await saveProfile(profile);
    await setSetting(ONBOARDED_KEY, '1');
    const chosen = parseInt(profile.duration ?? '', 10);
    if (Number.isFinite(chosen) && chosen > 0) {
      setDurationState(chosen);
      await setSetting(DURATION_KEY, String(chosen));
    }
    setOnboarded(true);
  }, []);

  const beginSession = useCallback(async (minutes: number) => {
    await setDurationMinutes(minutes);
    const existing = await getActiveSession();
    if (existing) {
      setActiveSession(existing);
      return;
    }
    await ensureSessionNotificationPermission();
    const session = await insertActiveSession(minutes);
    const endsAt = new Date(Date.parse(session.startedAt) + session.chosenDurationSeconds * 1000);
    const notificationId = await scheduleSessionEndNotification(endsAt);
    if (notificationId) {
      await setNotificationId(session.id, notificationId);
      session.notificationId = notificationId;
    }
    setActiveSession(session);
  }, [setDurationMinutes]);

  const completeActiveSession = useCallback(async () => {
    const session = activeRef.current;
    if (!session) return null;
    await cancelSessionNotification(session.notificationId);
    const endedAt = new Date(Date.parse(session.startedAt) + session.chosenDurationSeconds * 1000);
    await finishSession(session.id, 'completed', session.chosenDurationSeconds, endedAt);
    setActiveSession(null);
    await refreshSessions();
    return session.id;
  }, [refreshSessions]);

  const abortActiveSession = useCallback(async () => {
    const session = activeRef.current;
    if (!session) return null;
    await cancelSessionNotification(session.notificationId);
    const actual = elapsedSeconds(Date.parse(session.startedAt), Date.now(), session.chosenDurationSeconds);
    await finishSession(session.id, 'aborted', actual, new Date());
    setActiveSession(null);
    await refreshSessions();
    return session.id;
  }, [refreshSessions]);

  const noteBackground = useCallback(async () => {
    const session = activeRef.current;
    if (!session) return;
    await markBackgrounded(session.id, new Date());
  }, []);

  const noteForeground = useCallback(async () => {
    const session = activeRef.current;
    if (!session) return;
    await clearBackgrounded(session.id);
  }, []);

  const saveReflection = useCallback(async (sessionId: string, mood: MoodId | null, note: string) => {
    await upsertJournal(sessionId, mood, note);
    await refreshSessions();
  }, [refreshSessions]);

  const removeReflection = useCallback(async (sessionId: string) => {
    await deleteJournal(sessionId);
    await refreshSessions();
  }, [refreshSessions]);

  const value = useMemo<AppStateValue>(
    () => ({
      ready,
      storageError,
      launch,
      reflectionSessionId,
      user,
      updateUser,
      onboarded,
      completeOnboarding,
      durationMinutes,
      setDurationMinutes,
      sessions,
      activeSession,
      beginSession,
      completeActiveSession,
      abortActiveSession,
      noteBackground,
      noteForeground,
      saveReflection,
      removeReflection,
    }),
    [
      ready,
      storageError,
      launch,
      reflectionSessionId,
      user,
      updateUser,
      onboarded,
      completeOnboarding,
      durationMinutes,
      setDurationMinutes,
      sessions,
      activeSession,
      beginSession,
      completeActiveSession,
      abortActiveSession,
      noteBackground,
      noteForeground,
      saveReflection,
      removeReflection,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppState must be used inside AppStateProvider');
  return ctx;
}
