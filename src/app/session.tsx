import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Alert, Animated, AppState, Easing, StyleSheet, Text, View, type ViewInstance } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import Reanimated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LockHint } from '@/components/LockHint';
import { ScreenTitle } from '@/components/ScreenTitle';
import { SessionKlumpen } from '@/components/SessionKlumpen';
import {
  HOLD_A11Y_HINT,
  HOLD_A11Y_LABEL,
  HOLD_CONFIRM_CONTINUE,
  HOLD_CONFIRM_END,
  HOLD_CONFIRM_TITLE,
  HOLD_DONE_TEXT,
  REMAINING_LABEL,
  chosenMinutes,
  completionSentence,
} from '@/data/copy';
import { HOLD } from '@/session/holdToEnd';
import {
  HOLD_HINT_IDLE,
  applyHoldHintTimeout,
  holdHintGateFor,
  holdHintMomentAt,
  type HoldHintGate,
} from '@/session/lockHintVisibility';
import { SESSION_RING_GAP, SESSION_TIMER_BOX } from '@/session/sessionLayout';
import { decideUnfinishedSession } from '@/data/sessionRules';
import { useAppState } from '@/state/AppState';
import { noteEntryRoute } from '@/state/resetRoute';
import { screenPadding, useTheme } from '@/theme';

/** Active session. Always dark. Hold the Klumpen for four seconds to end early. */
export default function Session() {
  const { theme } = useTheme();
  const {
    activeSession,
    lockHintSessionId,
    completeActiveSession,
    abortActiveSession,
    noteBackground,
    noteForeground,
    showCountdown,
  } = useAppState();

  const session = activeSession;
  const startedAtMs = session ? Date.parse(session.startedAt) : 0;
  const chosenSeconds = session?.chosenDurationSeconds ?? 0;
  const endsAtMs = startedAtMs + chosenSeconds * 1000;
  const minutes = session ? chosenMinutes(session.chosenDurationSeconds) : 0;

  const [remaining, setRemaining] = useState(() =>
    session ? Math.max(0, Math.ceil((endsAtMs - Date.now()) / 1000)) : 0,
  );
  const [reduceMotion, setReduceMotion] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [statusBar, setStatusBar] = useState<'light' | 'dark'>('light');
  const [error, setError] = useState<string | null>(null);

  const remainingRef = useRef(remaining);
  remainingRef.current = remaining;
  const finished = useRef(false);
  const leaving = useRef(false);
  const morph = useRef(new Animated.Value(0)).current;
  const dissolve = useRef(new Animated.Value(1)).current;
  const holdFade = useSharedValue(0);
  const abortId = useRef<string | null>(null);
  const holdSettled = useRef(false);
  const holdHintRef = useRef<ViewInstance>(null);
  const [holdWindowY, setHoldWindowY] = useState<number | null>(null);
  const lockHintLabel = useSharedValue(1);
  const remainingStyle = useAnimatedStyle(() => ({
    opacity: lockHintLabel.value,
  }));
  const freshLockHint = session != null && session.id === lockHintSessionId;
  const [holdGate, setHoldGate] = useState<HoldHintGate>(HOLD_HINT_IDLE);
  const holdMoment = holdHintMomentAt(holdGate, Date.now());
  useEffect(() => {
    if (holdGate.moment !== 'cancel' || holdGate.reopenAt == null) return;
    const scheduled = holdGate.reopenAt;
    const delay = Math.max(0, scheduled - Date.now());
    const id = setTimeout(() => {
      setHoldGate((current) => applyHoldHintTimeout(current, scheduled, Date.now()));
    }, delay);
    return () => clearTimeout(id);
  }, [holdGate]);
  const hideHintForHold = useCallback(() => {
    setHoldGate(holdHintGateFor('start', Date.now(), HOLD.releaseMs));
  }, []);
  const hideHintForCancel = useCallback(() => {
    setHoldGate(holdHintGateFor('cancel', Date.now(), HOLD.releaseMs));
  }, []);
  const hideHintForComplete = useCallback(() => {
    setHoldGate(holdHintGateFor('complete', Date.now(), HOLD.releaseMs));
  }, []);
  const minutesRef = useRef(minutes);
  if (session) minutesRef.current = minutes;
  const fadeStyle = useAnimatedStyle(() => ({ opacity: holdFade.value }));

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  const sessionIdRef = useRef<string | null>(null);
  sessionIdRef.current = session?.id ?? null;
  const handoff = useRef<string | null>(null);

  useEffect(() => {
    if (session || leaving.current || abortId.current || handoff.current) return;
    router.replace('/home');
  }, [session]);

  const away = useRef(false);
  const noted = useRef(false);

  const holdNote = () => {
    const id = sessionIdRef.current;
    if (id) handoff.current = id;
    leaving.current = true;
  };

  const openReflection = useCallback((id: string) => {
    if (!id || noted.current) return;
    noted.current = true;
    handoff.current = id;
    router.replace(noteEntryRoute(id));
  }, []);

  const finishExpired = useCallback(async () => {
    if (finished.current) return;
    finished.current = true;
    holdNote();
    setRemaining(0);
    try {
      const id = await completeActiveSession();
      if (!id) {
        setError('fikk ikke lagret. prøv igjen.');
        return;
      }
      openReflection(id);
    } catch {
      setError('fikk ikke lagret. prøv igjen.');
    }
  }, [completeActiveSession, openReflection]);

  const playCompletion = useCallback(
    async () => {
      if (finished.current) return;
      if (away.current || AppState.currentState !== 'active') {
        await finishExpired();
        return;
      }
      finished.current = true;
      holdNote();
      setRemaining(0);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft), 90);
      AccessibilityInfo.announceForAccessibility('Økten er over');
      try {
        const id = await completeActiveSession();
        if (!id) {
          setError('fikk ikke lagret. prøv igjen.');
          return;
        }
        setTimeout(() => {
          setShowDone(true);
          Animated.timing(morph, {
            toValue: 1,
            duration: reduceMotion ? theme.motion.default : theme.motion.slow,
            easing: Easing.out(Easing.ease),
            useNativeDriver: false,
          }).start(() => {
            if (theme.name === 'light') setStatusBar('dark');
            setTimeout(() => openReflection(id), theme.motion.completionHold);
          });
        }, theme.motion.sessionEndDelay);
      } catch {
        setError('fikk ikke lagret. prøv igjen.');
      }
    },
    [completeActiveSession, finishExpired, morph, openReflection, reduceMotion, theme.motion, theme.name],
  );

  const playAbort = useCallback(async () => {
    if (remainingRef.current <= 0) {
      playCompletion();
      return;
    }
    if (finished.current) return;
    finished.current = true;
    holdNote();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    AccessibilityInfo.announceForAccessibility(HOLD_DONE_TEXT);
    try {
      const id = await abortActiveSession();
      if (!id) {
        setError('fikk ikke lagret. prøv igjen.');
        return;
      }
      Animated.timing(dissolve, {
        toValue: 0,
        duration: HOLD.doneFadeMs,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start(() => openReflection(id));
    } catch {
      setError('fikk ikke lagret. prøv igjen.');
    }
  }, [abortActiveSession, dissolve, openReflection, playCompletion]);

  const maybeNavigate = useCallback(() => {
    if (abortId.current && holdSettled.current) openReflection(abortId.current);
  }, [openReflection]);

  const finishHeld = useCallback(async () => {
    hideHintForComplete();
    if (remainingRef.current <= 0) {
      playCompletion();
      return;
    }
    if (finished.current) return;
    finished.current = true;
    holdNote();
    AccessibilityInfo.announceForAccessibility(HOLD_DONE_TEXT);
    try {
      const id = await abortActiveSession();
      if (!id) {
        setError('fikk ikke lagret. prøv igjen.');
        return;
      }
      abortId.current = id;
      maybeNavigate();
      // The hold frame only reports settle inside a 50 ms window. If that frame
      // is missed, the note entry still opens with this session id.
      setTimeout(() => openReflection(id), HOLD.doneFadeAtMs + HOLD.doneFadeMs + 80);
    } catch {
      setError('fikk ikke lagret. prøv igjen.');
    }
  }, [abortActiveSession, hideHintForComplete, maybeNavigate, openReflection, playCompletion]);

  const onHoldSettled = useCallback(() => {
    holdSettled.current = true;
    maybeNavigate();
  }, [maybeNavigate]);

  const confirmEnd = useCallback(() => {
    if (finished.current || showDone) return;
    Alert.alert(HOLD_CONFIRM_TITLE, undefined, [
      { text: HOLD_CONFIRM_CONTINUE, style: 'cancel' },
      { text: HOLD_CONFIRM_END, onPress: () => playAbort() },
    ]);
  }, [playAbort, showDone]);

  useEffect(() => {
    if (!session || finished.current) return;
    const tick = () => {
      const left = Math.max(0, Math.round((endsAtMs - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0 && !away.current && AppState.currentState === 'active') playCompletion();
    };
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [session, endsAtMs, playCompletion]);

  useEffect(() => {
    if (!session) return;
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background') {
        away.current = true;
        noteBackground().catch(() => undefined);
        return;
      }
      if (next !== 'active' || finished.current) return;
      const decision = decideUnfinishedSession({
        nowMs: Date.now(),
        startedAtMs,
        chosenDurationSeconds: chosenSeconds,
      });
      if (decision.kind === 'completed') {
        finishExpired();
        return;
      }
      away.current = false;
      noteForeground().catch(() => undefined);
    });
    return () => sub.remove();
  }, [session, startedAtMs, chosenSeconds, noteBackground, noteForeground, finishExpired]);

  // Ending clears activeSession before the hold confirmation finishes, so the
  // screen and the klumpen's settle callback must stay mounted until navigation.
  // Otherwise onHoldSettled never fires and the Skia canvas unmounts mid-animation.
  if (!session && !showDone && !leaving.current) return null;

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const sentence = completionSentence(minutesRef.current);
  const background = morph.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.color.bg.session, theme.color.bg.default],
  });
  const runningOpacity = morph.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const doneOpacity = morph;

  return (
    <Animated.View style={[styles.root, { backgroundColor: background }]}>
      <StatusBar style={statusBar} />
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <Animated.View style={[styles.root, { opacity: dissolve }]}>
            <View pointerEvents="box-none" style={styles.stage}>
            <View pointerEvents="box-none" style={styles.column}>
              {showCountdown || showDone ? (
                <View style={styles.timerSlot} pointerEvents="none">
                  {showCountdown ? (
                    <Animated.Text
                      accessibilityRole="timer"
                      accessibilityLabel={`${mm} minutter og ${ss} sekunder ${REMAINING_LABEL}`}
                      adjustsFontSizeToFit
                      numberOfLines={1}
                      style={[
                        theme.text.monoTimer,
                        styles.timer,
                        { color: theme.color.session['text-primary'], opacity: runningOpacity },
                      ]}
                    >
                      {mm}:{ss}
                    </Animated.Text>
                  ) : null}
                  {showCountdown ? (
                    <Reanimated.Text
                      style={[theme.text.caption, styles.remaining, { color: theme.color.session['text-secondary'] }, remainingStyle]}
                    >
                      {REMAINING_LABEL}
                    </Reanimated.Text>
                  ) : null}
                </View>
              ) : null}
              <Animated.View
                style={[styles.doneCopy, { opacity: doneOpacity }]}
                pointerEvents="none"
                accessibilityElementsHidden={!showDone}
              >
                <Text style={[theme.text.eyebrow, { color: theme.color.text.primary }]}>Økt fullført</Text>
                <ScreenTitle align="center" variant="display">
                  {sentence}
                </ScreenTitle>
              </Animated.View>

              <SessionKlumpen
                minutes={minutesRef.current}
                enabled={!showDone}
                showHint={!showDone}
                fade={holdFade}
                morph={morph}
                gapAbove={showCountdown || showDone ? SESSION_RING_GAP : 0}
                material="gummi"
                accessibilityLabel={showDone ? `Økt fullført. ${sentence}` : HOLD_A11Y_LABEL}
                accessibilityHint={showDone ? undefined : HOLD_A11Y_HINT}
                accessibilityAction={!showDone}
                onComplete={finishHeld}
                onSettled={onHoldSettled}
                onHoldStart={hideHintForHold}
                onHoldCancel={hideHintForCancel}
                onAccessibilityEnd={confirmEnd}
                hintAnchorRef={holdHintRef}
                onHintLayout={() => {
                  holdHintRef.current?.measureInWindow((_x, y) => {
                    if (y > 0) setHoldWindowY(y);
                  });
                }}
              >
                <Animated.View pointerEvents="none" style={[styles.circleLayer, { opacity: doneOpacity }]}>
                  <View
                    accessible={false}
                    importantForAccessibility="no-hide-descendants"
                    accessibilityElementsHidden
                    style={[styles.dot, { backgroundColor: theme.color.ink.default }]}
                  />
                </Animated.View>
              </SessionKlumpen>
            </View>
          </View>
        </Animated.View>
      </SafeAreaView>
      <Reanimated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: theme.color.bg.session }, fadeStyle]}
      />
      {error ? (
        <Text style={[theme.text.caption, styles.error, { color: theme.color.session['text-secondary'] }]}>{error}</Text>
      ) : null}
      <LockHint
        enabled={freshLockHint}
        sessionId={session?.id ?? null}
        labelOpacity={lockHintLabel}
        flowAnchorY={holdWindowY}
        holdMoment={holdMoment}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: screenPadding },
  column: { alignSelf: 'stretch', alignItems: 'center', overflow: 'visible' },
  timerSlot: { height: SESSION_TIMER_BOX, alignSelf: 'stretch' },
  timer: { height: SESSION_TIMER_BOX, textAlign: 'center', includeFontPadding: false },
  remaining: { position: 'absolute', top: -20, left: 0, right: 0, textAlign: 'center' },
  doneCopy: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', gap: 8, zIndex: 0 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  error: { position: 'absolute', left: screenPadding, right: screenPadding, bottom: 48, textAlign: 'center', zIndex: 2 },
  circleLayer: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
});
