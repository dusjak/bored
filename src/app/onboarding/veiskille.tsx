import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { OnboardingHeader } from '@/components/OnboardingHeader';
import { Screen } from '@/components/Screen';
import { ScreenTitle } from '@/components/ScreenTitle';
import { confirmedMinutes, FORK_BODY, FORK_TITLE } from '@/onboarding/flow';
import { useAppState } from '@/state/AppState';
import { useTheme } from '@/theme';

/** Fork after del 1. No lump. Skip starts the first session and does not open Hjem. */
export default function Veiskille() {
  const { theme } = useTheme();
  const { user, updateUser, setDurationMinutes, completeOnboarding, beginSession } = useAppState();
  const minutes = confirmedMinutes(user.duration);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const tailor = () => {
    updateUser({ introPath: 'del2', duration: String(minutes), materialId: user.materialId ?? 'gummi' });
    router.push('/onboarding/distraction');
  };

  const skip = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      updateUser({ introPath: 'skip', duration: String(minutes), materialId: user.materialId ?? 'gummi' });
      await setDurationMinutes(minutes);
      await completeOnboarding();
      await beginSession(minutes);
      router.replace('/session');
    } catch {
      setError('fikk ikke lagret. prøv igjen.');
      setBusy(false);
    }
  };

  return (
    <Screen top="none" contentStyle={styles.content}>
      <OnboardingHeader dots={false} step={0} title="" sub="" />
      <ScreenTitle style={{ marginBottom: 8 }}>{FORK_TITLE}</ScreenTitle>
      <Text style={[theme.text.body, { color: theme.color.text.secondary }]}>{FORK_BODY}</Text>
      <View style={styles.spacer} />
      {error ? <Text style={[theme.text.caption, { color: theme.color.text.secondary }]}>{error}</Text> : null}
      <Button title="Lag planen min" disabled={busy} onPress={tailor} />
      <Button title="Hopp over og start første økt" variant="ghost" style={{ marginTop: 8 }} onPress={() => void skip()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  spacer: { flex: 1 },
});
