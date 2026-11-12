import { useEffect, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { router, type Href } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { QUESTIONS, type QuestionKey } from '@/data/mock';
import { useAppState } from '@/state/AppState';
import { Button } from './Button';
import { OnboardingHeader } from './OnboardingHeader';
import { OptionCard } from './OptionCard';
import { Screen } from './Screen';

const EASE = Easing.bezier(0.2, 0, 0, 1);

/** Opacity and 8 pt up. No sideways spring. */
function Rise({ delay, duration = 320, children }: { delay: number; duration?: number; children: ReactNode }) {
  const reduceMotion = useReducedMotion() === true;
  const y = useSharedValue(reduceMotion ? 0 : 8);
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) return;
    y.value = withDelay(delay, withTiming(0, { duration, easing: EASE }));
    opacity.value = withDelay(delay, withTiming(1, { duration, easing: EASE }));
  }, [delay, duration, opacity, reduceMotion, y]);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/** Shared single-choice onboarding step, driven by QUESTIONS in data/mock.ts. */
export function QuestionStep({ questionKey }: { questionKey: QuestionKey }) {
  const q = QUESTIONS[questionKey];
  const { user, updateUser } = useAppState();
  const [selected, setSelected] = useState<string | undefined>(
    user[questionKey] ?? (questionKey === 'duration' ? '10' : undefined),
  );

  return (
    <Screen top="none" contentStyle={styles.screen}>
      <OnboardingHeader bodySub step={q.step} title={q.title} sub={q.sub} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.options}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {q.options.map((o, i) => (
          <Rise key={o.id} delay={160 + i * 40}>
            <OptionCard
              question
              label={o.label}
              sub={o.sub}
              icon={q.withIcons ? o.icon : undefined}
              selected={selected === o.id}
              onPress={() => setSelected(o.id)}
            />
          </Rise>
        ))}
      </ScrollView>
      <Rise delay={160} duration={240}>
        <Button
          title="Fortsett"
          disabled={!selected}
          onPress={() => {
            updateUser({ [questionKey]: selected });
            router.push(q.next as Href);
          }}
        />
      </Rise>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 24 },
  scroll: { flex: 1, marginTop: 24 },
  options: { paddingBottom: 16 },
});
