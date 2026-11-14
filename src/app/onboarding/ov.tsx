import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { knappetrykk } from '@/analytics/track';
import { pushStep } from '@/onboarding/stepMotion';
import * as Haptics from 'expo-haptics';
import Animated, { Easing, useAnimatedStyle, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { KlumpenBody } from '@/components/Klumpen';
import { PinnedEngraving } from '@/materials/EngravedText';
import { ENGRAVED_NUMBER_TRACKING_EM, NUMBER_CENTER_FROM_CY, UNIT_CENTER_FROM_CY } from '@/materials/engraving';
import { PracticeRing, type PracticeRingLook } from '@/components/PracticeRing';
import { Screen } from '@/components/Screen';
import { ScreenTitle } from '@/components/ScreenTitle';
import { StoneAnchor } from '@/components/StoneAnchor';
import { HOLD_PHASE_TEXT, HOLD_TO_END_MS } from '@/data/copy';
import {
  confirmedMinutes,
  GUESS_HINT,
  HOLD_BODY,
  HOLD_CONTINUE_AFTER_MS,
  HOLD_HINT,
  HOLD_TITLE,
  holdCountdown,
  PRACTICE_CLOCK_START_MS,
  PRACTICE_DONE,
  practiceContinueReady,
} from '@/onboarding/flow';
import { drawProgress, strokeOpacity } from '@/session/trackStroke';
import { phaseIndex, sampleHold } from '@/session/holdToEnd';
import {
  DURATION_UNIT,
  durationType,
  HOME_UNIT_FONT_SIZE,
  klumpHeight,
  klumpWidth,
  maxRingInk,
  minutesToIndex,
} from '@/duration/klumpen';
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

/** Practice hold. The engraved clock stays on 10:00 until 1.70 s, then runs. */
export default function PracticeStep() {
  const { theme } = useTheme();
  const { fontScale } = useWindowDimensions();
  const reduceMotion = useOsReduceMotion();
  const { user } = useAppState();
  const minutes = confirmedMinutes(user.duration);
  const stoneIndex = minutesToIndex(minutes);
  const indexSv = useSharedValue(stoneIndex);
  const reduceSv = useSharedValue(0);
  const fadeFrom = useSharedValue(stoneIndex);
  const fadeTo = useSharedValue(stoneIndex);
  const fadeU = useSharedValue(1);
  const morph = useSharedValue(reduceMotion ? 1 : 0);
  const ghostOpacity = useDerivedValue(() => 0.55 * (1 - morph.value));
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

  useEffect(() => {
    if (reduceMotion) {
      morph.value = 1;
      return;
    }
    morph.value = 0;
    morph.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) });
  }, [morph, reduceMotion]);
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
  const clockRun = Math.max(0, clockMs - PRACTICE_CLOCK_START_MS);
  const numberSize = Math.round((Number(theme.text.monoHero.fontSize) || 56) * durationType(fontScale).numberScale);
  const clockSize = Math.min(numberSize, Math.round(klumpWidth(stoneIndex) * 0.28));
  const fromMark = useAnimatedStyle(() => ({
    opacity: 1 - morph.value,
    transform: [{ translateY: morph.value * 8 }],
  }));
  const unitMark = useAnimatedStyle(() => ({
    opacity: 1 - morph.value,
    transform: [{ translateY: morph.value * 12 }],
  }));
  const clockMark = useAnimatedStyle(() => ({
    opacity: morph.value,
    transform: [{ translateX: (1 - morph.value) * 14 }],
  }));
  const hintFrom = useAnimatedStyle(() => ({ opacity: 1 - morph.value }));
  const hintTo = useAnimatedStyle(() => ({ opacity: morph.value }));

  return (
    <Screen top="app" contentStyle={styles.content}>
      <View style={styles.copy}>
      <ScreenTitle style={{ marginBottom: 8 }}>{HOLD_TITLE}</ScreenTitle>
      <Text style={[theme.text.body, { color: theme.color.text.link }]}>{HOLD_BODY}</Text>
      </View>
      <View style={styles.spacer} />
      <StoneAnchor height={stoneH}>
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
          <View style={{ width: stoneW, height: stoneH, alignItems: 'center', justifyContent: 'center' }}>
            <KlumpenBody
              index={indexSv}
              minutes={minutes}
              reduce={reduceSv}
              reduceMotion={reduceMotion}
              fade={{ from: fadeFrom, to: fadeTo, u: fadeU }}
              ghost
              ghostColor={maxRingInk(theme.name, theme.color.text.tertiary, theme.color.text.primary)}
              ghostOpacity={ghostOpacity}
              rasterOnly
              digits={false}
            />
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <Animated.View style={[StyleSheet.absoluteFill, fromMark]}>
                <PinnedEngraving
                  text={String(minutes)}
                  fontSize={numberSize}
                  centerY={NUMBER_CENTER_FROM_CY}
                  trackingEm={ENGRAVED_NUMBER_TRACKING_EM}
                />
              </Animated.View>
              <Animated.View style={[StyleSheet.absoluteFill, unitMark]}>
                <PinnedEngraving text={DURATION_UNIT} fontSize={HOME_UNIT_FONT_SIZE} centerY={UNIT_CENTER_FROM_CY} />
              </Animated.View>
              <Animated.View style={[StyleSheet.absoluteFill, clockMark]}>
                <PinnedEngraving
                  text={holdCountdown(minutes, clockRun)}
                  fontSize={clockSize}
                  centerY={0}
                  trackingEm={ENGRAVED_NUMBER_TRACKING_EM}
                />
              </Animated.View>
            </View>
            <PracticeRing minutes={minutes} look={ring} />
          </View>
        </Pressable>
        <View style={{ marginTop: practiceHintGap(minutes), minHeight: 20 }}>
          <Animated.Text
            style={[
              theme.text.caption,
              styles.status,
              hintFrom,
              { position: 'absolute', left: 0, right: 0, color: theme.color.text.tertiary },
            ]}
          >
            {GUESS_HINT}
          </Animated.Text>
          <Animated.Text
            style={[
              theme.text.caption,
              styles.status,
              hintTo,
              { color: done ? theme.color.text.link : theme.color.text.tertiary },
            ]}
          >
            {hint}
          </Animated.Text>
        </View>
      </StoneAnchor>
      {showContinue ? (
        <Button
          title="Fortsett"
          onPress={() => {
            knappetrykk({ type: 'Stegnavigasjon', navn: 'Fortsett', hendelse: 'trykk', skjerm: 'Du kan alltid bryte økten hvis du blir urolig' });
            pushStep('/onboarding/veiskille');
          }}
        />
      ) : null}
      <Animated.View style={hintTo}>
        <Button
          title="Hopp over"
          variant="ghost"
          style={showContinue ? { marginTop: 8 } : undefined}
          onPress={() => {
            knappetrykk({ type: 'Stegnavigasjon', navn: 'Hopp over', hendelse: 'trykk', skjerm: 'Du kan alltid bryte økten hvis du blir urolig' });
            pushStep('/onboarding/veiskille');
          }}
        />
      </Animated.View>
    </Screen>
  );
}

function useOsReduceMotion() {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => {
        if (live) setReduceMotion(on);
      })
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  return reduceMotion;
}

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  copy: { minHeight: 140 },
  spacer: { flex: 1 },
  status: { textAlign: 'center' },
});
