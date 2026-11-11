import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { LiveKlump } from '@/components/LiveKlump';
import { Screen } from '@/components/Screen';
import { ScreenTitle } from '@/components/ScreenTitle';
import { FORM_STONE_PT, KJEDOMHET_BODY } from '@/onboarding/flow';
import { emptyOffsets } from '@/onboarding/formShape';
import { useTheme } from '@/theme';

const REST = emptyOffsets();

/** Black gummi, no time, no skip. */
export default function KjedomhetStep() {
  const { theme } = useTheme();
  return (
    <Screen top="app" contentStyle={styles.content}>
      <ScreenTitle style={{ marginBottom: 8 }}>Hva er kjedsomhet?</ScreenTitle>
      <Text style={[theme.text.body, { color: theme.color.text.secondary }]}>{KJEDOMHET_BODY}</Text>
      <View style={styles.stone}>
        <LiveKlump material="gummi" minutes={10} offsets={REST} digits={false} widthPt={FORM_STONE_PT} />
      </View>
      <Button title="Form klumpen" onPress={() => router.push('/onboarding/form')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  stone: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
