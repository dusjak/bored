import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Easing, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Logo } from '@/components/Logo';
import { TactileCircle } from '@/components/TactileCircle';
import { HOLD_TO_END_MS, chosenMinutes, completionSentence } from '@/data/copy';
import { decideUnfinishedSession } from '@/data/sessionRules';
import { useAppState } from '@/state/AppState';
import { useTheme } from '@/theme';

/** Active session. Always dark. Hold the circle for one second to end early. */
export default function Session() {
  const { theme } = useTheme();
  const {
    activeSession,
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
  const didLong = useRef(false);
  const hint = useRef(new Animated.Value(0)).current;
  const morph = useRef(new Animated.Value(0)).current;
  const dissolve = useRef(new Animated.Value(1)).current;
  const holdScale = useRef(new Animated.Value(1)).current;
  const holding = useRef(false);
  const holdHaptics = useRef<ReturnType<typeof setInterval> | null>(null);
  const minutesRef = useRef(minutes);
  if (session) minutesRef.current = minutes;

  useEffect(() => {
    return () => {
      if (holdHaptics.current) clearInterval(holdHaptics.current);
    };
  }, []);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!session && !leaving.current) router.replace('/home');
  }, [session]);

  const away = useRef(false);

  const openReflection = useCallback((id: string) => {
    router.replace({ pathname: '/reflection', params: { sessionId: id } });
  }, []);

  const finishExpired = useCallback(async () => {
    if (finished.current) return;
    finished.current = true;
    leaving.current = true;
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
      leaving.current = true;
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
    leaving.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const id = await abortActiveSession();
      if (!id) {
        setError('fikk ikke lagret. prøv igjen.');
        return;
      }
      Animated.timing(dissolve, {
        toValue: 0,
        duration: theme.motion.default,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start(() => openReflection(id));
    } catch {
      setError('fikk ikke lagret. prøv igjen.');
    }
  }, [abortActiveSession, dissolve, openReflection, playCompletion, theme.motion.default]);

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

  const stopHold = () => {
    holding.current = false;
    if (holdHaptics.current) {
      clearInterval(holdHaptics.current);
      holdHaptics.current = null;
    }
    Animated.spring(holdScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 0 }).start();
  };

  const startHold = () => {
    if (finished.current || showDone) return;
    holding.current = true;
    Animated.timing(holdScale, {
      toValue: 0.94,
      duration: HOLD_TO_END_MS,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
    const started = Date.now();
    holdHaptics.current = setInterval(() => {
      if (!holding.current) return;
      if (Date.now() - started < 300) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    }, 180);
  };

  const brightenHint = () => {
    hint.setValue(1);
    Animated.timing(hint, { toValue: 0, duration: 1000, useNativeDriver: false }).start();
  };

  if (!session && !showDone) return null;

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const sentence = completionSentence(minutesRef.current);
  const background = morph.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.color.bg.session, theme.color.bg.default],
  });
  const circleFill = morph.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.color.session.object, theme.color.object.fill],
  });
  const runningOpacity = morph.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const doneOpacity = morph;
  const hintColor = hint.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.color.session['text-tertiary'], theme.color.session['text-secondary']],
  });

  return (
    <Animated.View style={[styles.root, { backgroundColor: background }]}>
      <StatusBar style={statusBar} />
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <Animated.View style={[styles.root, { opacity: dissolve }]}>
          <View style={styles.stage}>
            <View style={styles.timerBlock}>
              {showCountdown ? (
                <Animated.View style={{ opacity: runningOpacity, alignItems: 'center' }} pointerEvents={showDone ? 'none' : 'auto'}>
                  <Text
                    accessibilityRole="timer"
                    accessibilityLabel={`${mm} minutter og ${ss} sekunder gjenstår`}
                    adjustsFontSizeToFit
                    numberOfLines={1}
                    style={[theme.text.monoTimer, styles.timer, { color: theme.color.session['text-primary'] }]}
                  >
                    {mm}:{ss}
                  </Text>
                  <Text style={[theme.text.caption, { color: theme.color.session['text-secondary'] }]}>gjenstår</Text>
                </Animated.View>
              ) : null}
              <Animated.View
                style={[styles.doneCopy, { opacity: doneOpacity }]}
                pointerEvents="none"
                accessibilityElementsHidden={!showDone}
              >
                <Text style={[theme.text.eyebrow, { color: theme.color.text.primary }]}>Økt fullført</Text>
                <Text style={[theme.text.headline, styles.sentence, { color: theme.color.text.primary }]}>{sentence}</Text>
              </Animated.View>
            </View>

            <Animated.View style={{ transform: [{ scale: holdScale }] }}>
            <TactileCircle
              fill={circleFill}
              onPressIn={startHold}
              onPressOut={stopHold}
              onPress={() => {
                if (didLong.current) {
                  didLong.current = false;
                  return;
                }
                if (finished.current) return;
                brightenHint();
              }}
              onLongPress={() => {
                if (finished.current || remainingRef.current <= 0) return;
                didLong.current = true;
                playAbort();
              }}
              delayLongPress={HOLD_TO_END_MS}
              accessibilityLabel={showDone ? `Økt fullført. ${sentence}` : 'Sirkel'}
              accessibilityHint={showDone ? undefined : 'Hold inne sirkelen for å avslutte'}
              accessibilityActions={showDone ? undefined : [{ name: 'end', label: 'Avslutt økt' }]}
              onAccessibilityAction={(event) => {
                if (event.nativeEvent.actionName === 'end') playAbort();
              }}
            >
              <Animated.View
                pointerEvents="none"
                style={[styles.circleLayer, { opacity: runningOpacity }]}
                accessible={false}
                importantForAccessibility="no-hide-descendants"
                accessibilityElementsHidden
              >
                <Logo
                  size={22}
                  color={theme.color.session.decorative}
                  dotColor={theme.color.session.decorative}
                />
              </Animated.View>
              <Animated.View pointerEvents="none" style={[styles.circleLayer, { opacity: doneOpacity }]}>
                <View
                  accessible={false}
                  importantForAccessibility="no-hide-descendants"
                  accessibilityElementsHidden
                  style={[styles.dot, { backgroundColor: theme.color.ink.default }]}
                />
              </Animated.View>
            </TactileCircle>
            </Animated.View>

            <Animated.Text style={[theme.text.caption, styles.hint, { color: hintColor, opacity: runningOpacity }]}>
              Hold inne sirkelen for å avslutte
            </Animated.Text>
            {error ? <Text style={[theme.text.caption, { color: theme.color.session['text-secondary'] }]}>{error}</Text> : null}
          </View>
        </Animated.View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, paddingTop: 30, gap: 28 },
  timerBlock: { minHeight: 140, alignItems: 'center', justifyContent: 'center' },
  timer: { width: '100%', textAlign: 'center' },
  doneCopy: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 8 },
  sentence: { textAlign: 'center' },
  hint: { textAlign: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  circleLayer: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
});
