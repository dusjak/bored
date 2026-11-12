import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { OnboardingHeader } from '@/components/OnboardingHeader';
import { OptionCard } from '@/components/OptionCard';
import { Screen } from '@/components/Screen';
import { DURATION_LIST, DURATION_LIST_HELP, DURATION_LIST_TITLE, confirmedMinutes } from '@/onboarding/flow';
import { useAppState } from '@/state/AppState';
import { space } from '@/theme';

/** Del 2 list. The preselected row is the del 1 guess. This choice replaces it. */
export default function DurationStep() {
  const { user, updateUser, setDurationMinutes } = useAppState();
  const [selected, setSelected] = useState<5 | 10 | 15 | 20>(confirmedMinutes(user.duration));

  return (
    <Screen top="none" contentStyle={styles.screen}>
      <OnboardingHeader step={3} title={DURATION_LIST_TITLE} sub={DURATION_LIST_HELP} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.options} showsVerticalScrollIndicator={false}>
        {DURATION_LIST.map((item) => (
          <OptionCard
            key={item.minutes}
            label={item.label}
            sub={item.sub}
            selected={selected === item.minutes}
            onPress={() => setSelected(item.minutes)}
          />
        ))}
      </ScrollView>
      <Button
        title="Fortsett"
        onPress={() => {
          updateUser({ duration: String(selected) });
          void setDurationMinutes(selected);
          router.push('/onboarding/time');
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
