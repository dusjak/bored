import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useReducedMotion } from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { IntroStone } from '@/components/IntroStone';
import { OnboardingHeader } from '@/components/OnboardingHeader';
import { Screen } from '@/components/Screen';
import { HOLD_TO_END_MS } from '@/data/copy';
import { BLI_STEP, confirmedMinutes, defaultMaterial, practiceWelcomeReady, skipBliKjent } from '@/onboarding/flow';
import { emptyOffsets } from '@/onboarding/formShape';
import { drawProgress, strokeOpacity } from '@/session/trackStroke';
import { phaseIndex } from '@/session/holdToEnd';
import { useAppState } from '@/state/AppState';
import { useTheme } from '@/theme';

/** Practice hold. It does not start a session. «Til velkommen» appears only after a completed hold. */
export default function PracticeStep() {
  const { theme } = useTheme();
  const reduceMotion = useReducedMotion() === true;
  const { user, updateUser, setDurationMinutes } = useAppState();
  const minutes = confirmedMinutes(user.duration);
  const material = defaultMaterial(user.materialId);
  const offsets = user.forms?.[material] ?? emptyOffsets();
  const [done, setDone] = useState(false);
  const [ring, setRing] = useState({ progress: 0, opacity: 0 });
  const pressAt = useRef(-1);
  const releaseAt = useRef(-1);
  const doneAt = useRef(-1);
  const phaseSent = useRef(0);
  const frame = useRef(0);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const tick = () => {
    const now = Date.now();
    const pressed = pressAt.current >= 0 && releaseAt.current < 0 && doneAt.current < 0;
    const holdMs = pressAt.current < 0 ? 0 : (pressed ? now - pressAt.current : releaseAt.current - pressAt.current);
    if (pressed && holdMs >= HOLD_TO_END_MS && doneAt.current < 0) {
      doneAt.current = pressAt.current + HOLD_TO_END_MS;
      setDone(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    if (pressed) {
      const phase = phaseIndex(holdMs);
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
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(tick);
  };

  const end = () => {
    if (pressAt.current < 0 || doneAt.current >= 0 || releaseAt.current >= 0) return;
    releaseAt.current = Date.now();
    frame.current = requestAnimationFrame(tick);
  };

  const finishPractice = () => {
    doneAt.current = Date.now();
    setDone(true);
    setRing({ progress: 1, opacity: 1 });
  };

  const skip = () => {
    const next = skipBliKjent('ov', minutes);
    updateUser({ duration: String(next.minutes), materialId: material });
    void setDurationMinutes(next.minutes);
    router.push('/onboarding/velkommen');
  };

  return (
    <Screen session top="none" contentStyle={styles.content}>
      <OnboardingHeader
        step={BLI_STEP.ov}
        total={5}
        title="Du bestemmer."
        sub={done ? 'Du avsluttet øvingen. Det er alltid lov å bryte.' : 'Hold for å avslutte.'}
        ink={theme.color.session['text-primary']}
        subInk={theme.color.session['text-secondary']}
        dot={theme.color.session['text-primary']}
        dotIdle="#3A3936"
      />
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
          <IntroStone minutes={minutes} material={material} offsets={offsets} ring={ring} />
        </Pressable>
        <Text style={[theme.text.caption, styles.status, { color: theme.color.session['text-secondary'] }]}>
          {done ? 'Øving avsluttet' : ring.opacity > 0.04 ? 'Hold for å avslutte' : ''}
        </Text>
      </View>
      <Button
        title="Til velkommen"
        variant="inverse"
        disabled={!practiceWelcomeReady(done)}
        onPress={() => router.push('/onboarding/velkommen')}
      />
      <Button title="Hopp over" variant="darkGhost" style={{ marginTop: 8 }} onPress={skip} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  stone: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  status: { marginTop: 16, textAlign: 'center' },
});
