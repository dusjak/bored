import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Button } from '@/components/Button';
import { FormStone } from '@/components/FormStone';
import { Screen } from '@/components/Screen';
import { ScreenTitle } from '@/components/ScreenTitle';
import { confirmedMinutes, defaultMaterial, FORM_HELP, FORM_STONE_PT, FORM_TITLE } from '@/onboarding/flow';
import { emptyOffsets } from '@/onboarding/formShape';
import { useAppState } from '@/state/AppState';
import { useTheme } from '@/theme';

/** Shape the stored material, or gummi when nothing is stored. Other saved forms stay. */
export default function FormStep() {
  const { theme } = useTheme();
  const { user, updateUser } = useAppState();
  const minutes = confirmedMinutes(user.duration);
  const material = defaultMaterial(user.materialId);
  const saved = user.forms?.[material] ?? emptyOffsets();
  const [offsets, setOffsets] = useState(saved);
  const [past, setPast] = useState<number[][]>([]);

  const keep = () => {
    updateUser({
      materialId: user.materialId ?? 'gummi',
      forms: { ...user.forms, [material]: offsets },
    });
    router.push('/onboarding/se');
  };

  return (
    <Screen top="app" contentStyle={styles.content}>
      <ScreenTitle style={{ marginBottom: 8 }}>{FORM_TITLE}</ScreenTitle>
      <Text style={[theme.text.body, styles.help, { color: theme.color.text.secondary }]}>{FORM_HELP}</Text>
      <View style={styles.stone}>
        <FormStone
          material={material}
          minutes={minutes}
          widthPt={FORM_STONE_PT}
          offsets={offsets}
          ringColor={theme.color.text.tertiary}
          onCommit={(next) => {
            setPast((stack) => [...stack, offsets]);
            setOffsets(next);
          }}
        />
      </View>
      <View style={styles.actions}>
        <Button
          title="Angre"
          variant="ghost"
          style={styles.half}
          onPress={() => {
            const previous = past[past.length - 1];
            if (!previous) return;
            setPast((stack) => stack.slice(0, -1));
            setOffsets(previous);
            void Haptics.selectionAsync();
          }}
        />
        <Button
          title="Nullstill"
          variant="ghost"
          style={styles.half}
          onPress={() => {
            if (offsets.every((value) => value === 0)) return;
            setPast((stack) => [...stack, offsets]);
            setOffsets(emptyOffsets());
            void Haptics.selectionAsync();
          }}
        />
      </View>
      <Button title="Velg klumpen" onPress={keep} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  help: { marginBottom: 8 },
  stone: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  half: { width: '46%' },
});
