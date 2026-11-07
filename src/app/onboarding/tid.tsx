import { router } from 'expo-router';

import { DurationChooser } from '@/components/DurationChooser';
import { OnboardingHeader } from '@/components/OnboardingHeader';
import { Screen } from '@/components/Screen';
import { BLI_STEP, confirmedMinutes, skipBliKjent } from '@/onboarding/flow';
import { useAppState } from '@/state/AppState';

/** Existing duration stone. Fortsett confirms. Hopp over sets 10 and goes to Rom. No auto-advance. */
export default function TidStep() {
  const { user, updateUser, setDurationMinutes } = useAppState();
  const current = confirmedMinutes(user.duration);

  const save = (minutes: number, to: 'rom' | 'velkommen') => {
    updateUser({ duration: String(minutes) });
    void setDurationMinutes(minutes);
    router.push(to === 'rom' ? '/onboarding/rom' : '/onboarding/velkommen');
  };

  return (
    <Screen top="none" contentStyle={{ paddingBottom: 24 }}>
      <OnboardingHeader
        step={BLI_STEP.tid}
        total={5}
        title="Velg varighet"
        sub="Hvor lang tid har du i dag?"
      />
      <DurationChooser
        minutes={current}
        onConfirm={(minutes) => save(minutes, 'rom')}
        onSkip={() => save(skipBliKjent('tid', current).minutes, 'rom')}
      />
    </Screen>
  );
}
