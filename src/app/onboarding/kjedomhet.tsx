import { StyleSheet, Text, View } from 'react-native';
import { pushStep } from '@/onboarding/stepMotion';

import { Button } from '@/components/Button';
import { PressOutLump } from '@/components/PressOutLump';
import { Screen } from '@/components/Screen';
import { ScreenTitle } from '@/components/ScreenTitle';
import { StoneAnchor } from '@/components/StoneAnchor';
import { klumpHeight, klumpWidth } from '@/duration/klumpen';
import { KJEDOMHET_BODY } from '@/onboarding/flow';
import { useTheme } from '@/theme';

/** Static 10-minute Gummi. No time, no shaping, no skip. */
export default function KjedomhetStep() {
  const { theme } = useTheme();
  return (
    <Screen top="app" contentStyle={styles.content}>
      <View style={styles.copy}>
      <ScreenTitle style={{ marginBottom: 8 }}>Hva er kjedsomhet?</ScreenTitle>
      <Text style={[theme.text.body, { color: theme.color.text.secondary }]}>{KJEDOMHET_BODY}</Text>
      </View>
      <View style={styles.spacer} />
      <StoneAnchor height={klumpHeight(klumpWidth(1))}>
        <PressOutLump />
      </StoneAnchor>
      <Button title="Fortsett" onPress={() => pushStep('/onboarding/tid')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  copy: { minHeight: 140 },
  spacer: { flex: 1 },
});
