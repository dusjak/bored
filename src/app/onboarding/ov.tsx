import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useReducedMotion } from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { GummiPicture } from '@/components/GummiPicture';
import { Screen } from '@/components/Screen';
import { ScreenTitle } from '@/components/ScreenTitle';
import { HOLD_PHASE_TEXT, HOLD_TO_END_MS } from '@/data/copy';
import {
  confirmedMinutes,
  HOLD_BODY,
  HOLD_CONTINUE_AFTER_MS,
  HOLD_HINT,
  HOLD_TITLE,
  holdCountdown,
  practiceContinueReady,
} from '@/onboarding/flow';
import { drawProgress, strokeOpacity } from '@/session/trackStroke';
import { phaseIndex } from '@/session/holdToEnd';
import { useAppState } from '@/state/AppState';
import { useTheme } from '@/theme';

/** Practice hold. It does not start a session. Fortsett waits for the hold, or 30 seconds. */
export default function PracticeStep() {
  const { theme } = useTheme();
  const reduceMotion = useReducedMotion() === true;
  const { user } = useAppState();
  const minutes = confirmedMinutes(user.duration);
  const [done, setDone] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [ring, setRing] = useState({ progress: 0, opacity: 0 });
  const [hint, setHint] = useState(HOLD_HINT);
  const [clockMs, setClockMs] = useState(0);
  const [counting, setCounting] = useState(false);
  const pressAt = useRef(-1);
  const releaseAt = useRef(-1);
  const doneAt = useRef(-1);
  const phaseSent = useRef(0);
  const frame = useRef(0);
  const counted = useRef(0);
  const countFrom = useRef(-1);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  useEffect(() => {
    const id = setTimeout(() => setUnlocked(true), HOLD_CONTINUE_AFTER_MS);
    return () => clearTimeout(id);
  }, []);

  const tick = () => {
    const now = Date.now();
    const pressed = pressAt.current >= 0 && releaseAt.current < 0 && doneAt.current < 0;
    const holdMs = pressAt.current < 0 ? 0 : pressed ? now - pressAt.current : releaseAt.current - pressAt.current;
    if (pressed && holdMs >= HOLD_TO_END_MS && doneAt.current < 0) {
      doneAt.current = pressAt.current + HOLD_TO_END_MS;
      counted.current = now - countFrom.current;
      setDone(true);
      setCounting(false);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    if (pressed) {
      counted.current = now - countFrom.current;
      setClockMs(counted.current);
      const phase = phaseIndex(holdMs);
      setHint(HOLD_PHASE_TEXT[phase] ?? HOLD_HINT);
      while (phaseSent.current < phase) {
        phaseSent.current += 1;
        if (phaseSent.current === 1 || phaseSent.current === 2) {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    }
    setRing({
      progress: drawProgress(Math.min(holdMs, HOLD_TO_END_MS)),
      opacity: strokeOpacity(pressAt.current >= 0, holdMs, now, releaseAt.current, doneAt.current, reduceMotion),
    });
    const moving = pressed || (releaseAt.current >= 0 && doneAt.current < 0 && now - releaseAt.current < 300);
    if (moving) frame.current = requestAnimationFrame(tick);
  };

  const begin = () => {
    if (doneAt.current >= 0) return;
    pressAt.current = Date.now();
    releaseAt.current = -1;
    phaseSent.current = 0;
    countFrom.current = Date.now() - counted.current;
    setCounting(true);
    setHint(HOLD_PHASE_TEXT[0]);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(tick);
  };

  const end = () => {
    if (pressAt.current < 0 || doneAt.current >= 0 || releaseAt.current >= 0) return;
    releaseAt.current = Date.now();
    counted.current = releaseAt.current - countFrom.current;
    setClockMs(counted.current);
    setCounting(false);
    setHint(HOLD_HINT);
    frame.current = requestAnimationFrame(tick);
  };

  const finishPractice = () => {
    doneAt.current = Date.now();
    setDone(true);
    setCounting(false);
    setRing({ progress: 1, opacity: 1 });
  };

  const showContinue = practiceContinueReady(done, unlocked ? HOLD_CONTINUE_AFTER_MS : 0);
  const clock = counting || clockMs > 0 ? holdCountdown(minutes, clockMs) : undefined;

  return (
    <Screen top="app" contentStyle={styles.content}>
      <ScreenTitle style={{ marginBottom: 8 }}>{HOLD_TITLE}</ScreenTitle>
      <Text style={[theme.text.body, { color: theme.color.text.link }]}>{HOLD_BODY}</Text>
      <View style={styles.stone}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Øv hold"
          accessibilityHint="Hold inne, eller bruk Avslutt øving"
          accessibilityActions={[{ name: 'activate', label: 'Avslutt øving' }]}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === 'activate') finishPractice();
          }}
          onPressIn={begin}
          onPressOut={end}
        >
          <GummiPicture minutes={minutes} label={clock} ring={ring} />
        </Pressable>
        <Text style={[theme.text.caption, styles.status, { color: theme.color.text.tertiary }]}>{hint}</Text>
      </View>
      {showContinue ? (
        <Button title="Fortsett" onPress={() => router.push('/onboarding/veiskille')} />
      ) : null}
      <Button
        title="Hopp over"
        variant="ghost"
        style={showContinue ? { marginTop: 8 } : undefined}
        onPress={() => router.push('/onboarding/veiskille')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  stone: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  status: { marginTop: 16, textAlign: 'center' },
});
