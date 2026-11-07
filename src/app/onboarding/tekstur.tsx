import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Button } from '@/components/Button';
import { IntroStone } from '@/components/IntroStone';
import { LiveKlump } from '@/components/LiveKlump';
import { OnboardingHeader } from '@/components/OnboardingHeader';
import { Screen } from '@/components/Screen';
import type { KlumpMaterialId } from '@/data/types';
import { BLI_STEP, confirmedMinutes, defaultMaterial, skipBliKjent } from '@/onboarding/flow';
import { MATERIAL_DRAG, emptyOffsets } from '@/onboarding/formShape';
import { useAppState } from '@/state/AppState';
import { useTheme } from '@/theme';

/** Gummi starts selected. Choosing a texture does not advance. */
export default function TeksturStep() {
  const { theme } = useTheme();
  const { user, updateUser, setDurationMinutes } = useAppState();
  const minutes = confirmedMinutes(user.duration);
  const material = defaultMaterial(user.materialId);
  const selected = MATERIAL_DRAG.find((item) => item.id === material) ?? MATERIAL_DRAG[0];
  const offsets = user.forms?.[material] ?? emptyOffsets();

  const choose = (id: KlumpMaterialId) => {
    if (id === material) return;
    void Haptics.selectionAsync();
    updateUser({ materialId: id });
  };

  const skip = () => {
    const next = skipBliKjent('tekstur', minutes);
    updateUser({ duration: String(next.minutes), materialId: material });
    void setDurationMinutes(next.minutes);
    router.push('/onboarding/velkommen');
  };

  return (
    <Screen top="none" contentStyle={styles.content}>
      <OnboardingHeader
        step={BLI_STEP.tekstur}
        total={5}
        title="Hvordan kjennes din?"
        sub="Velg en tekstur. Fargen er alltid svart."
      />
      <View style={styles.stone}>
        <IntroStone minutes={minutes} material={material} offsets={offsets} />
        <Text style={[theme.text.caption, styles.line, { color: theme.color.text.tertiary }]}>{selected.line}</Text>
      </View>
      <View style={styles.row}>
        {MATERIAL_DRAG.map((item) => {
          const on = item.id === material;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={item.name}
              accessibilityState={{ selected: on }}
              onPress={() => choose(item.id)}
              style={[
                styles.cell,
                {
                  borderColor: on ? theme.color.ink.default : 'transparent',
                  backgroundColor: theme.color.surface.default,
                },
              ]}
            >
              <View style={styles.pip}>
                <LiveKlump material={item.id} minutes={minutes} offsets={emptyOffsets()} digits={false} widthPt={36} />
              </View>
              <Text style={[theme.text.caption, { color: theme.color.text.primary }]}>{item.name}</Text>
            </Pressable>
          );
        })}
      </View>
      <Button title="Form klumpen" onPress={() => router.push('/onboarding/form')} />
      <Button title="Hopp over" variant="ghost" style={{ marginTop: 8 }} onPress={skip} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  stone: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  line: { marginTop: 16, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  cell: { width: 61, height: 92, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  pip: { width: 44, height: 44, marginBottom: 4, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
});
