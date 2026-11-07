import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { IntroStone } from '@/components/IntroStone';
import { OnboardingHeader } from '@/components/OnboardingHeader';
import { Screen } from '@/components/Screen';
import { BLI_STEP, confirmedMinutes, defaultMaterial, skipBliKjent } from '@/onboarding/flow';
import { emptyOffsets } from '@/onboarding/formShape';
import { useAppState } from '@/state/AppState';

/** Rom without the unease box. That box lives on Hjem. */
export default function RomStep() {
  const { user, updateUser, setDurationMinutes } = useAppState();
  const minutes = confirmedMinutes(user.duration);
  const material = defaultMaterial(user.materialId);
  const offsets = user.forms?.[material] ?? emptyOffsets();

  const skip = () => {
    const next = skipBliKjent('rom', minutes);
    updateUser({ duration: String(next.minutes) });
    void setDurationMinutes(next.minutes);
    router.push('/onboarding/velkommen');
  };

  return (
    <Screen top="none" contentStyle={styles.content}>
      <OnboardingHeader
        step={BLI_STEP.rom}
        total={5}
        title="Din egen kjedsomhet."
        sub="Litt rom for ro og egne tanker."
      />
      <View style={styles.stone}>
        <IntroStone minutes={minutes} material={material} offsets={offsets} />
      </View>
      <Button title="Gjør den til din" onPress={() => router.push('/onboarding/tekstur')} />
      <Button title="Hopp over" variant="ghost" style={{ marginTop: 8 }} onPress={skip} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  stone: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
