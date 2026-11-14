import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import type { Href } from 'expo-router';
import { QUESTIONS, type QuestionKey } from '@/data/mock';
import { useAppState } from '@/state/AppState';
import { knappetrykk } from '@/analytics/track';
import { pushStep } from '@/onboarding/stepMotion';
import { Button } from './Button';
import { OnboardingHeader } from './OnboardingHeader';
import { OptionCard } from './OptionCard';
import { OptionRise } from './OptionRise';
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
      <OnboardingHeader bodySub step={q.step} title={q.title} sub={q.sub} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.options}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {q.options.map((o, i) => (
          <OptionRise key={o.id} delay={160 + i * 40}>
            <OptionCard
              question
              label={o.label}
              sub={o.sub}
              icon={q.withIcons ? o.icon : undefined}
              selected={selected === o.id}
              onPress={() => {
                knappetrykk({ type: 'Valg', navn: o.label, hendelse: 'trykk', skjerm: q.title });
                setSelected(o.id);
              }}
            />
          </OptionRise>
        ))}
      </ScrollView>
      <OptionRise delay={160} duration={240}>
        <Button
          title="Fortsett"
          disabled={!selected}
          onPress={() => {
            knappetrykk({ type: 'Stegnavigasjon', navn: 'Fortsett', hendelse: 'trykk', skjerm: q.title });
            updateUser({ [questionKey]: selected });
            pushStep(q.next as Href);
          }}
        />
      </OptionRise>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 24 },
  scroll: { flex: 1, marginTop: 24 },
  options: { paddingBottom: 16 },
});
