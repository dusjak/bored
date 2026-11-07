import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { IntroStone } from '@/components/IntroStone';
import { OnboardingHeader } from '@/components/OnboardingHeader';
import { Screen } from '@/components/Screen';
import { ScreenTitle } from '@/components/ScreenTitle';
import { confirmedMinutes, defaultMaterial } from '@/onboarding/flow';
import { emptyOffsets } from '@/onboarding/formShape';
import { useAppState } from '@/state/AppState';
import { useTheme } from '@/theme';

/** Veiskille 1. Skip starts the first session directly. It does not open Hjem, and it has no unease box. */
export default function Veiskille() {
  const { theme } = useTheme();
  const { user, updateUser, setDurationMinutes, completeOnboarding, beginSession } = useAppState();
  const minutes = confirmedMinutes(user.duration);
  const material = defaultMaterial(user.materialId);
  const offsets = user.forms?.[material] ?? emptyOffsets();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const tailor = () => {
    updateUser({ introPath: 'del2', duration: String(minutes), materialId: material });
    router.push('/onboarding/distraction');
  };

  const skip = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      updateUser({ introPath: 'skip', duration: String(minutes), materialId: material });
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
      <OnboardingHeader step={4} total={5} title="" sub="" />
      <Text style={[theme.text.eyebrow, { color: theme.color.text.secondary }]}>Del 2 er valgfri</Text>
      <ScreenTitle style={{ marginTop: 8, marginBottom: 8 }}>{'Vil du ha litt\nmer hjelp?'}</ScreenTitle>
      <Text style={[theme.text.body, { color: theme.color.text.secondary }]}>
        Vi kan hjelpe deg å velge tid og sette opp varsler.
      </Text>
      <View style={styles.stone}>
        <IntroStone minutes={minutes} material={material} offsets={offsets} />
      </View>
      {error ? <Text style={[theme.text.caption, { color: theme.color.text.secondary }]}>{error}</Text> : null}
      <Button title="Tilpass planen" disabled={busy} onPress={tailor} />
      <Button title="Hopp over og start første økt" variant="ghost" style={{ marginTop: 8 }} onPress={() => void skip()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  stone: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
