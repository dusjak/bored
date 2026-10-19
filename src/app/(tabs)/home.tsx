import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { DurationSheet } from '@/components/DurationSheet';
import { Logo } from '@/components/Logo';
import { Screen } from '@/components/Screen';
import { TactileCircle } from '@/components/TactileCircle';
import { minutesPhrase } from '@/data/copy';
import { useAppState } from '@/state/AppState';
import { useTheme } from '@/theme';

export default function Home() {
  const { theme } = useTheme();
  const { durationMinutes, setDurationMinutes, beginSession } = useAppState();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const start = async () => {
    if (starting) return;
    setStarting(true);
    setError(null);
    try {
      await beginSession(durationMinutes);
      router.push('/session');
    } catch {
      setError('fikk ikke lagret. prøv igjen.');
    } finally {
      setStarting(false);
    }
  };

  return (
    <Screen edges={['top']} contentStyle={styles.content}>
      <View style={styles.top}>
        <Logo />
      </View>

      <View style={styles.hero}>
        <TactileCircle
          onPress={() => setPickerOpen(true)}
          accessibilityLabel={minutesPhrase(durationMinutes)}
          accessibilityHint="Endre lengde"
        >
          <Text style={[theme.text.monoHero, { color: theme.color.object.content }]}>{durationMinutes}</Text>
          <Text style={[theme.text.caption, { color: theme.color.object.content }]}>minutter</Text>
        </TactileCircle>
        <Text style={[theme.text.caption, { color: theme.color.text.tertiary, marginTop: theme.space['6'] }]}>
          Trykk for å endre lengde
        </Text>
      </View>

      {error ? (
        <Text style={[theme.text.caption, { color: theme.color.text.secondary, marginBottom: theme.space['3'] }]}>{error}</Text>
      ) : null}
      <Button
        title="Start"
        size="comfort"
        accessibilityLabel="Start økt"
        disabled={starting}
        onPress={start}
        style={{ marginBottom: theme.space['4'] }}
      />

      <DurationSheet
        visible={pickerOpen}
        current={durationMinutes}
        onUse={(minutes) => {
          setDurationMinutes(minutes).catch(() => setError('fikk ikke lagret. prøv igjen.'));
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 120 },
  top: {},
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
