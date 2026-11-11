import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { LiveKlump } from '@/components/LiveKlump';
import { Screen } from '@/components/Screen';
import { ScreenTitle } from '@/components/ScreenTitle';
import { confirmedMinutes, defaultMaterial, FORM_STONE_PT, SE_BODY, SE_TITLE } from '@/onboarding/flow';
import { emptyOffsets } from '@/onboarding/formShape';
import { useAppState } from '@/state/AppState';
import { useTheme } from '@/theme';

/** The shaped lump, still without a time. */
export default function SeStep() {
  const { theme } = useTheme();
  const { user } = useAppState();
  const material = defaultMaterial(user.materialId);
  const offsets = user.forms?.[material] ?? emptyOffsets();
  return (
    <Screen top="app" contentStyle={styles.content}>
      <ScreenTitle style={{ marginBottom: 8 }}>{SE_TITLE}</ScreenTitle>
      <Text style={[theme.text.body, { color: theme.color.text.secondary }]}>{SE_BODY}</Text>
      <View style={styles.stone}>
        <LiveKlump
          material={material}
          minutes={confirmedMinutes(user.duration)}
          offsets={offsets}
          digits={false}
          widthPt={FORM_STONE_PT}
        />
      </View>
      <Button title="Fortsett" onPress={() => router.push('/onboarding/tid')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  stone: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
