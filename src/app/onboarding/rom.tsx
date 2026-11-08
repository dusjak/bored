import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { IntroStone } from '@/components/IntroStone';
import { OnboardingHeader } from '@/components/OnboardingHeader';
import { Screen } from '@/components/Screen';
import { BLI_STEP, confirmedMinutes, defaultMaterial } from '@/onboarding/flow';
import { emptyOffsets } from '@/onboarding/formShape';
import { useAppState } from '@/state/AppState';

/** Rom without the unease box. That box lives on Hjem. */
export default function RomStep() {
  const { user } = useAppState();
  const minutes = confirmedMinutes(user.duration);
  const material = defaultMaterial(user.materialId);
  const offsets = user.forms?.[material] ?? emptyOffsets();

  return (
    <Screen top="none" contentStyle={styles.content}>
      <OnboardingHeader
        dots={false}
        step={BLI_STEP.rom}
        total={5}
        title="Din egen kjedsomhet."
        sub="Litt rom for ro og egne tanker."
      />
      <View style={styles.stone}>
        <IntroStone minutes={minutes} material={material} offsets={offsets} />
      </View>
      <Button title="Gjør den til din" onPress={() => router.push('/onboarding/tekstur')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  stone: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
