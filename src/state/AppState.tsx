import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState as AppActivity } from 'react-native';

import { clampDurationMinutes, DEFAULT_DURATION_MINUTES, reminderSchedule } from '@/data/copy';
import {
  cancelAllScheduledNotifications,
  cancelDailyReminder,
  cancelSessionNotification,
  dismissSessionNotification,
  hasNotificationPermission,
  requestNotificationPermission,
  scheduleDailyReminder,
  scheduleSessionEndNotification,
} from '@/data/notifications';
import {
  clearAllLocalData,
  clearBackgrounded,
  deleteJournal,
  deleteSession as deleteStoredSession,
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
  SHOW_COUNTDOWN_KEY,
  SPLASH_SEEN_KEY,
  upsertJournal,
} from '@/data/repository';
import { decideUnfinishedSession, elapsedSeconds } from '@/data/sessionRules';
import type { MoodId, OnboardingProfile, SessionRecord, SessionWithJournal } from '@/data/types';
import {
  initialSplash,
  reduceSplashAppState,
  shouldPersistSplashSeen,
  splashAfterReset,
  splashReplay,
  type IntroPhase,
  type SplashOccasion,
} from '@/splash/splashDecision';

export type { IntroPhase };

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
  /** Deletes the session and its note, then refreshes the log totals. */
  deleteSession: (sessionId: string) => Promise<void>;
  showCountdown: boolean;
  setShowCountdown: (on: boolean) => Promise<void>;
  setDailyReminder: (on: boolean) => Promise<'on' | 'off' | 'denied'>;
  refreshDailyReminder: () => Promise<void>;
  /** Wipes local data and scheduled alerts. Does not change the OS notification permission. */
  resetLocalData: () => Promise<void>;
  /**
   * play = MegaSplash. still = Pust or Dråpe (the plate is up).
   * fade = the plate is leaving. enter = MegaSplash handed off and welcome rises.
   * off = no overlay.
   */
  introPhase: IntroPhase;
  /** Why the overlay is up. The player picks MegaSplash, Pust, or Dråpe from this. */
  splashOccasion: SplashOccasion;
  /**
   * Background return only. False means the plate was the iOS snapshot and should leave
   * without Pust. True on a cold start.
   */
  splashCalm: boolean;
  /** False while the app is backgrounded: the wordmark stays, and the hold waits for active. */
  splashHoldArmed: boolean;
  /** Latest session/reflection flag for the AppState listener. Ref write, no render. */
  setSplashSuppressed: (suppressed: boolean) => void;
  beginIntroSplash: () => void;
  /**
   * TODO: The real existing-account flow replaces the caller.
   * Plays full Sluket as a first launch. Does not change stored data or the route.
   */
  replayIntroSplash: () => void;
  setIntroPhase: (phase: IntroPhase) => void;
  /** Crash fallback. Writes bored.splashSeen even if the timeline never reaches fade. */
  markSplashSeen: () => void;
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
  const [showCountdown, setShowCountdownState] = useState(true);
  const [introPhase, setIntroPhaseState] = useState<IntroPhase>('off');
  const [splashOccasion, setSplashOccasion] = useState<SplashOccasion>('later-launch');
  const [splashCalm, setSplashCalm] = useState(true);
  const [splashHoldArmed, setSplashHoldArmed] = useState(true);
  const userRef = useRef(user);
  const activeRef = useRef(activeSession);
  userRef.current = user;
  activeRef.current = activeSession;
  const suppressedRef = useRef(false);
  const sawBackgroundRef = useRef(false);
  const backgroundAtRef = useRef<number | null>(null);
  const phaseRef = useRef(introPhase);
  const occasionRef = useRef(splashOccasion);
  const calmRef = useRef(splashCalm);
  const holdRef = useRef(splashHoldArmed);
  phaseRef.current = introPhase;
  occasionRef.current = splashOccasion;
  calmRef.current = splashCalm;
  holdRef.current = splashHoldArmed;

  const refreshSessions = useCallback(async () => {
    setSessions(await listFinishedSessions());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await initDatabase();
        const [profile, onboardedRaw, durationRaw, countdownRaw, splashSeen, finished, active] = await Promise.all([
          getProfile(),
          getSetting(ONBOARDED_KEY),
          getSetting(DURATION_KEY),
          getSetting(SHOW_COUNTDOWN_KEY),
          getSetting(SPLASH_SEEN_KEY),
          listFinishedSessions(),
          getActiveSession(),
        ]);
        if (cancelled) return;
        setUser(profile);
        const isOnboarded = onboardedRaw === '1';
        setOnboarded(isOnboarded);
        const parsedDuration = durationRaw ? parseInt(durationRaw, 10) : DEFAULT_DURATION_MINUTES;
        const fromProfile = profile.duration ? parseInt(profile.duration, 10) : NaN;
        const initialDuration = Number.isFinite(parsedDuration)
          ? clampDurationMinutes(parsedDuration)
          : Number.isFinite(fromProfile)
            ? clampDurationMinutes(fromProfile)
            : DEFAULT_DURATION_MINUTES;
        setDurationState(initialDuration);
        setShowCountdownState(countdownRaw !== '0');
        setSessions(finished);
        try {
          if (profile.notifications === true && (await hasNotificationPermission())) {
            const clock = reminderSchedule(profile.time);
            await scheduleDailyReminder(clock.hour, clock.minute);
          }
        } catch {
          // A reminder failure must not block the first screen.
        }

        if (active) {
          const decision = decideUnfinishedSession({
            nowMs: Date.now(),
            startedAtMs: Date.parse(active.startedAt),
            chosenDurationSeconds: active.chosenDurationSeconds,
          });
          if (decision.kind === 'completed') {
            await cancelSessionNotification(active.notificationId);
            await finishSession(active.id, 'completed', decision.actualDurationSeconds, new Date(decision.endedAtMs));
            if (cancelled) return;
            setActiveSession(null);
            setReflectionSessionId(active.id);
            setLaunch('reflection');
            setSessions(await listFinishedSessions());
          } else {
            setActiveSession(active);
            setLaunch('session');
          }
          const splash = initialSplash({ splashSeen: splashSeen === '1', inSessionOrReflection: true });
          setSplashOccasion(splash.occasion);
          setIntroPhaseState(splash.phase);
          setSplashHoldArmed(splash.phase !== 'off');
        } else {
          setLaunch(isOnboarded ? 'home' : 'onboarding');
          const splash = initialSplash({ splashSeen: splashSeen === '1', inSessionOrReflection: false });
          setSplashOccasion(splash.occasion);
          setIntroPhaseState(splash.phase);
          setSplashHoldArmed(true);
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
    const next = clampDurationMinutes(minutes);
    setDurationState(next);
    await setSetting(DURATION_KEY, String(next));
  }, []);

  const completeOnboarding = useCallback(async () => {
    const profile = userRef.current;
    await saveProfile(profile);
    await setSetting(ONBOARDED_KEY, '1');
    const chosen = parseInt(profile.duration ?? '', 10);
    if (Number.isFinite(chosen)) {
      const next = clampDurationMinutes(chosen);
      setDurationState(next);
      await setSetting(DURATION_KEY, String(next));
    }
    setOnboarded(true);
  }, []);

  const beginSession = useCallback(async (minutes: number) => {
    const next = clampDurationMinutes(minutes);
    await setDurationMinutes(next);
    const existing = await getActiveSession();
    if (existing) {
      setActiveSession(existing);
      return;
    }
    const session = await insertActiveSession(next);
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
    await dismissSessionNotification(session.notificationId);
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

  const setShowCountdown = useCallback(async (on: boolean) => {
    setShowCountdownState(on);
    await setSetting(SHOW_COUNTDOWN_KEY, on ? '1' : '0');
  }, []);

  const refreshDailyReminder = useCallback(async () => {
    if (userRef.current.notifications !== true) return;
    if (!(await hasNotificationPermission())) return;
    const clock = reminderSchedule(userRef.current.time);
    await scheduleDailyReminder(clock.hour, clock.minute);
  }, []);

  const setDailyReminder = useCallback(async (on: boolean): Promise<'on' | 'off' | 'denied'> => {
    if (!on) {
      await cancelDailyReminder();
      const next = { ...userRef.current, notifications: false };
      setUser(next);
      await saveProfile(next);
      return 'off';
    }
    const granted = await requestNotificationPermission();
    if (!granted) return 'denied';
    const clock = reminderSchedule(userRef.current.time);
    await scheduleDailyReminder(clock.hour, clock.minute);
    const next = { ...userRef.current, notifications: true };
    setUser(next);
    await saveProfile(next);
    return 'on';
  }, []);

  const beginIntroSplash = useCallback(() => {
    const splash = splashAfterReset();
    setSplashOccasion(splash.occasion);
    setSplashCalm(true);
    setIntroPhaseState(splash.phase);
    setSplashHoldArmed(true);
    sawBackgroundRef.current = false;
    backgroundAtRef.current = null;
  }, []);

  const replayIntroSplash = useCallback(() => {
    const splash = splashReplay();
    setSplashOccasion(splash.occasion);
    setSplashCalm(true);
    setIntroPhaseState(splash.phase);
    setSplashHoldArmed(true);
    sawBackgroundRef.current = false;
    backgroundAtRef.current = null;
  }, []);

  const setIntroPhase = useCallback((phase: IntroPhase) => {
    setIntroPhaseState(phase);
    if (shouldPersistSplashSeen({ phase, crashed: false, occasion: occasionRef.current })) {
      void setSetting(SPLASH_SEEN_KEY, '1').catch(() => undefined);
    }
  }, []);

  const markSplashSeen = useCallback(() => {
    void setSetting(SPLASH_SEEN_KEY, '1').catch(() => undefined);
  }, []);

  const setSplashSuppressed = useCallback((suppressed: boolean) => {
    suppressedRef.current = suppressed;
  }, []);

  useEffect(() => {
    const sub = AppActivity.addEventListener('change', (next) => {
      const reduced = reduceSplashAppState({
        event: next,
        sawBackground: sawBackgroundRef.current,
        inSessionOrReflection: suppressedRef.current,
        phase: phaseRef.current,
        occasion: occasionRef.current,
        armHold: holdRef.current,
        nowMs: Date.now(),
        backgroundAtMs: backgroundAtRef.current,
        calm: calmRef.current,
      });
      const phaseChanged = reduced.phase !== phaseRef.current;
      const occasionChanged = reduced.occasion !== occasionRef.current;
      const calmChanged = reduced.calm !== calmRef.current;
      sawBackgroundRef.current = reduced.sawBackground;
      backgroundAtRef.current = reduced.backgroundAtMs;
      phaseRef.current = reduced.phase;
      occasionRef.current = reduced.occasion;
      calmRef.current = reduced.calm;
      holdRef.current = reduced.armHold;
      if (phaseChanged) setIntroPhaseState(reduced.phase);
      if (occasionChanged) setSplashOccasion(reduced.occasion);
      if (calmChanged) setSplashCalm(reduced.calm);
      setSplashHoldArmed(reduced.armHold);
    });
    return () => sub.remove();
  }, []);

  const resetLocalData = useCallback(async () => {
    await cancelAllScheduledNotifications();
    await clearAllLocalData();
    setUser({});
    setOnboarded(false);
    setDurationState(DEFAULT_DURATION_MINUTES);
    setShowCountdownState(true);
    setSessions([]);
    setActiveSession(null);
    setReflectionSessionId(null);
    setLaunch('onboarding');
  }, []);

  const deleteSession = useCallback(async (sessionId: string) => {
    const active = activeRef.current;
    if (active?.id === sessionId) {
      await cancelSessionNotification(active.notificationId);
      await dismissSessionNotification(active.notificationId);
      setActiveSession(null);
    }
    await deleteStoredSession(sessionId);
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
      deleteSession,
      showCountdown,
      setShowCountdown,
      setDailyReminder,
      refreshDailyReminder,
      resetLocalData,
      introPhase,
      splashOccasion,
      splashCalm,
      splashHoldArmed,
      setSplashSuppressed,
      beginIntroSplash,
      replayIntroSplash,
      setIntroPhase,
      markSplashSeen,
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
      deleteSession,
      showCountdown,
      setShowCountdown,
      setDailyReminder,
      refreshDailyReminder,
      resetLocalData,
      introPhase,
      splashOccasion,
      splashCalm,
      splashHoldArmed,
      setSplashSuppressed,
      beginIntroSplash,
      replayIntroSplash,
      setIntroPhase,
      markSplashSeen,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppState must be used inside AppStateProvider');
  return ctx;
}
