import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { GummiPicture } from '@/components/GummiPicture';
import { Screen } from '@/components/Screen';
import { ScreenTitle } from '@/components/ScreenTitle';
import { KJEDOMHET_BODY } from '@/onboarding/flow';
import { useTheme } from '@/theme';

/** Static 10-minute Gummi. No time, no shaping, no skip. */
export default function KjedomhetStep() {
  const { theme } = useTheme();
  return (
    <Screen top="app" contentStyle={styles.content}>
      <ScreenTitle style={{ marginBottom: 8 }}>Hva er kjedsomhet?</ScreenTitle>
      <Text style={[theme.text.body, { color: theme.color.text.secondary }]}>{KJEDOMHET_BODY}</Text>
      <View style={styles.stone}>
        <GummiPicture minutes={10} digits={false} />
      </View>
      <Button title="Fortsett" onPress={() => router.push('/onboarding/tid')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  stone: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
