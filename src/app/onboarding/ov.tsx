import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useReducedMotion } from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { GummiPicture } from '@/components/GummiPicture';
import { PracticeRing, type PracticeRingLook } from '@/components/PracticeRing';
import { Screen } from '@/components/Screen';
import { ScreenTitle } from '@/components/ScreenTitle';
import { StoneAnchor } from '@/components/StoneAnchor';
import { HOLD_PHASE_TEXT, HOLD_TO_END_MS } from '@/data/copy';
import {
  confirmedMinutes,
  HOLD_BODY,
  HOLD_CONTINUE_AFTER_MS,
  HOLD_HINT,
  HOLD_TITLE,
  holdCountdown,
  PRACTICE_DONE,
  practiceContinueReady,
} from '@/onboarding/flow';
import { drawProgress, strokeOpacity } from '@/session/trackStroke';
import { phaseIndex, sampleHold } from '@/session/holdToEnd';
import { klumpHeight, klumpWidth } from '@/duration/klumpen';
import { practiceHintGap } from '@/onboarding/practiceLayout';
import { useAppState } from '@/state/AppState';
import { useTheme } from '@/theme';

const REST_RING: PracticeRingLook = {
  progress: 0,
  track: 0,
  glow: 0,
  glowR: 0,
  strokeW: 2.5,
  litMix: 0,
  en: 0,
};

/** Practice hold. The clock runs from the moment the step opens. */
export default function PracticeStep() {
  const { theme } = useTheme();
  const reduceMotion = useReducedMotion() === true;
  const { user } = useAppState();
  const minutes = confirmedMinutes(user.duration);
  const [done, setDone] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [ring, setRing] = useState<PracticeRingLook>(REST_RING);
  const [hint, setHint] = useState(HOLD_HINT);
  const [clockMs, setClockMs] = useState(0);
  const pressAt = useRef(-1);
  const releaseAt = useRef(-1);
  const doneAt = useRef(-1);
  const phaseSent = useRef(0);
  const frame = useRef(0);
  const opened = useRef(Date.now());

  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  useEffect(() => {
    if (done) return;
    const id = setInterval(() => setClockMs(Date.now() - opened.current), 250);
    return () => clearInterval(id);
  }, [done]);
  useEffect(() => {
    const id = setTimeout(() => setUnlocked(true), HOLD_CONTINUE_AFTER_MS);
    return () => clearTimeout(id);
  }, []);

  const paint = (now: number) => {
    const pressed = pressAt.current >= 0 && releaseAt.current < 0 && doneAt.current < 0;
    const holdMs = pressAt.current < 0 ? 0 : pressed ? now - pressAt.current : releaseAt.current - pressAt.current;
    const gesture = {
      pressAt: pressAt.current < 0 ? null : pressAt.current,
      releaseAt: releaseAt.current < 0 ? null : releaseAt.current,
      doneAt: doneAt.current < 0 ? null : doneAt.current,
    };
    const sample = sampleHold(gesture, now, { reduceMotion, solid: false });
    const finished = doneAt.current >= 0;
    setRing({
      progress: finished ? 1 : drawProgress(Math.min(holdMs, HOLD_TO_END_MS)),
      track: finished ? 1 : strokeOpacity(pressAt.current >= 0, holdMs, now, releaseAt.current, doneAt.current, reduceMotion),
      glow: sample.glowAlpha,
      glowR: sample.glowR,
      strokeW: sample.strokeW,
      litMix: sample.litMix,
      en: sample.en,
    });
  };

  const tick = () => {
    const now = Date.now();
    const pressed = pressAt.current >= 0 && releaseAt.current < 0 && doneAt.current < 0;
    const holdMs = pressAt.current < 0 ? 0 : pressed ? now - pressAt.current : releaseAt.current - pressAt.current;
    if (pressed && holdMs >= HOLD_TO_END_MS && doneAt.current < 0) {
      doneAt.current = pressAt.current + HOLD_TO_END_MS;
      setDone(true);
      setHint(PRACTICE_DONE);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    if (pressed && doneAt.current < 0) {
      const phase = phaseIndex(holdMs);
      setHint(HOLD_PHASE_TEXT[phase] ?? HOLD_HINT);
      while (phaseSent.current < phase) {
        phaseSent.current += 1;
        if (phaseSent.current === 1 || phaseSent.current === 2) {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    }
    paint(now);
    const finished = doneAt.current >= 0;
    const settling = finished && now - doneAt.current < 800;
    const fading = releaseAt.current >= 0 && !finished && now - releaseAt.current < 300;
    if (pressed || settling || fading) frame.current = requestAnimationFrame(tick);
  };

  const begin = () => {
    if (doneAt.current >= 0) return;
    pressAt.current = Date.now();
    releaseAt.current = -1;
    phaseSent.current = 0;
    setHint(HOLD_PHASE_TEXT[0]);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(tick);
  };

  const end = () => {
    if (pressAt.current < 0 || doneAt.current >= 0 || releaseAt.current >= 0) return;
    releaseAt.current = Date.now();
    setHint(HOLD_HINT);
    frame.current = requestAnimationFrame(tick);
  };

  const finishPractice = () => {
    doneAt.current = Date.now();
    setDone(true);
    setHint(PRACTICE_DONE);
    setRing({ progress: 1, track: 1, glow: 0.85, glowR: 13, strokeW: 4, litMix: 1, en: 1 });
  };

  const showContinue = practiceContinueReady(done, unlocked ? HOLD_CONTINUE_AFTER_MS : 0);
  const stoneW = klumpWidth(3);
  const stoneH = klumpHeight(stoneW);

  return (
    <Screen top="app" contentStyle={styles.content}>
      <View style={styles.copy}>
      <ScreenTitle style={{ marginBottom: 8 }}>{HOLD_TITLE}</ScreenTitle>
      <Text style={[theme.text.body, { color: theme.color.text.link }]}>{HOLD_BODY}</Text>
      </View>
      <StoneAnchor height={stoneH} style={styles.stone}>
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
          <View style={{ width: stoneW, height: stoneH }}>
            <GummiPicture minutes={minutes} label={holdCountdown(minutes, clockMs)} />
            <PracticeRing minutes={minutes} look={ring} />
          </View>
        </Pressable>
        <Text
          style={[
            theme.text.caption,
            styles.status,
            { marginTop: practiceHintGap(minutes), color: done ? theme.color.text.link : theme.color.text.tertiary },
          ]}
        >
          {hint}
        </Text>
      </StoneAnchor>
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
  copy: { minHeight: 140 },
  stone: { overflow: 'visible' },
  status: { textAlign: 'center' },
});
