import { router } from 'expo-router';

import { DurationChooser } from '@/components/DurationChooser';
import { OnboardingHeader } from '@/components/OnboardingHeader';
import { Screen } from '@/components/Screen';
import { BLI_STEP, confirmedMinutes, PART1_DURATION_INGRESS } from '@/onboarding/flow';
import { useAppState } from '@/state/AppState';

/** Existing duration stone. Fortsett confirms the chosen minutes and opens Rom. */
export default function TidStep() {
  const { user, updateUser, setDurationMinutes } = useAppState();
  const current = confirmedMinutes(user.duration);

  const save = (minutes: number) => {
    updateUser({ duration: String(minutes) });
    void setDurationMinutes(minutes);
    router.push('/onboarding/rom');
  };

  return (
    <Screen top="none" contentStyle={{ paddingBottom: 24 }}>
      <OnboardingHeader
        dots={false}
        step={BLI_STEP.tid}
        total={5}
        title="Velg varighet"
        sub={PART1_DURATION_INGRESS}
      />
      <DurationChooser minutes={current} onConfirm={save} />
    </Screen>
  );
}
