import { StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { ScreenTitle } from '@/components/ScreenTitle';
import { DONE_BODY, DONE_TITLE } from '@/onboarding/flow';
import { useTheme } from '@/theme';

/**
 * After the hold. Fortsett and Hopp over both open the fork.
 * Only the fork's own link starts the first session.
 */
export default function AlltidStep() {
  const { theme } = useTheme();
  const next = () => router.push('/onboarding/veiskille');
  return (
    <Screen top="app" contentStyle={styles.content}>
      <ScreenTitle style={{ marginBottom: 8 }}>{DONE_TITLE}</ScreenTitle>
      <Text style={[theme.text.body, { color: theme.color.text.secondary }]}>{DONE_BODY}</Text>
      <Text style={styles.spacer} />
      <Button title="Fortsett" onPress={next} />
      <Button title="Hopp over" variant="ghost" style={{ marginTop: 8 }} onPress={next} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  spacer: { flex: 1 },
});
