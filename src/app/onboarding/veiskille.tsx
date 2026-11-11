import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { OnboardingHeader } from '@/components/OnboardingHeader';
import { Screen } from '@/components/Screen';
import { ScreenTitle } from '@/components/ScreenTitle';
import { confirmedMinutes, FORK_BODY, FORK_TITLE } from '@/onboarding/flow';
import { useAppState } from '@/state/AppState';
import { useTheme } from '@/theme';

/** Bridge after the practice. Skip goes to the name, then the summary. No reminder, no questions. */
export default function Veiskille() {
  const { theme } = useTheme();
  const { user, updateUser } = useAppState();
  const minutes = confirmedMinutes(user.duration);

  const tailor = () => {
    updateUser({ introPath: 'del2', duration: String(minutes), materialId: user.materialId ?? 'gummi' });
    router.push('/onboarding/distraction');
  };

  const skip = () => {
    updateUser({ introPath: 'skip', duration: String(minutes), materialId: user.materialId ?? 'gummi' });
    router.push({ pathname: '/onboarding/name', params: { after: 'ready' } });
  };

  return (
    <Screen top="none" contentStyle={styles.content}>
      <OnboardingHeader step={0} title="" sub="" />
      <ScreenTitle style={{ marginBottom: 8 }}>{FORK_TITLE}</ScreenTitle>
      <Text style={[theme.text.body, { color: theme.color.text.secondary }]}>{FORK_BODY}</Text>
      <View style={styles.spacer} />
      <Button title="Tilpass øktene" onPress={tailor} />
      <Button title="Hopp over" variant="ghost" style={{ marginTop: 8 }} onPress={skip} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  spacer: { flex: 1 },
});
