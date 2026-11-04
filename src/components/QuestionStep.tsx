import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { router, type Href } from 'expo-router';

import { QUESTIONS, type QuestionKey } from '@/data/mock';
import { useAppState } from '@/state/AppState';
import { space } from '@/theme';
import { Button } from './Button';
import { cardSlideDelay, cardSlideOffset, ForwardSlide } from './ForwardSlide';
import { OnboardingHeader } from './OnboardingHeader';
import { OptionCard } from './OptionCard';
import { Screen } from './Screen';

/** Shared single-choice onboarding step, driven by QUESTIONS in data/mock.ts. */
export function QuestionStep({ questionKey }: { questionKey: QuestionKey }) {
  const q = QUESTIONS[questionKey];
  const { user, updateUser } = useAppState();
  const [selected, setSelected] = useState<string | undefined>(
    user[questionKey] ?? (questionKey === 'duration' ? '10' : undefined),
  );

  return (
    <Screen top="none" contentStyle={styles.screen}>
      <OnboardingHeader slideSub step={q.step} title={q.title} sub={q.sub} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.options}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {q.options.map((o, i) => (
          <ForwardSlide key={o.id} offset={cardSlideOffset(i)} delay={cardSlideDelay(i)}>
            <OptionCard
              label={o.label}
              sub={o.sub}
              icon={q.withIcons ? o.icon : undefined}
              selected={selected === o.id}
              onPress={() => setSelected(o.id)}
            />
          </ForwardSlide>
        ))}
      </ScrollView>
      <Button
        title="Fortsett"
        disabled={!selected}
        onPress={() => {
          updateUser({ [questionKey]: selected });
          router.push(q.next as Href);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: space['8'] },
  scroll: { flex: 1 },
  options: { paddingBottom: space['6'] },
});
