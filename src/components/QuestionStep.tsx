import { useState } from 'react';
import { View } from 'react-native';
import { router, type Href } from 'expo-router';

import { QUESTIONS, type QuestionKey } from '@/data/mock';
import { useAppState } from '@/state/AppState';
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
    <Screen scroll contentStyle={{ paddingBottom: 32 }}>
      <OnboardingHeader slideSub step={q.step} title={q.title} sub={q.sub} />
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
      <View style={{ height: 24 }} />
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
