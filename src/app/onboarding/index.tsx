import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { KlumpenGlyph } from '@/components/Klumpen';
import { Screen } from '@/components/Screen';
import { ScreenTitle } from '@/components/ScreenTitle';
import { skipBliKjent } from '@/onboarding/flow';
import { useAppState } from '@/state/AppState';
import { useTheme } from '@/theme';

/** A1. The meeting. No stepper and no unease box. */
export default function MeetKlumpen() {
  const { theme } = useTheme();
  const { updateUser, setDurationMinutes } = useAppState();

  const skip = () => {
    const next = skipBliKjent('a1', 10);
    updateUser({ duration: String(next.minutes), materialId: 'gummi' });
    void setDurationMinutes(next.minutes);
    router.push('/onboarding/velkommen');
  };

  return (
    <Screen top="app" contentStyle={styles.content}>
      <View>
        <ScreenTitle variant="display" style={{ marginBottom: 12 }}>
          Dette er kjedsomhet.
        </ScreenTitle>
        <Text style={[theme.text.body, { color: theme.color.text.secondary }]}>
          Du kan kalle den for klumpen din. Den holder tiden for deg, så du slipper å se på mobilen din.
        </Text>
      </View>
      <View style={styles.stone}>
        <Pressable accessibilityRole="button" accessibilityLabel="Trykk på klumpen" onPress={() => router.push('/onboarding/tid')}>
          <KlumpenGlyph width={160} fill={theme.color.ink.default} />
        </Pressable>
        <Text style={[theme.text.caption, styles.hint, { color: theme.color.text.tertiary }]}>Trykk på klumpen</Text>
      </View>
      <Button title="Hopp over" variant="ghost" onPress={skip} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  stone: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hint: { marginTop: 28, textAlign: 'center' },
});
