import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { DurationSheet } from '@/components/DurationSheet';
import { HomeKlumpen } from '@/components/Klumpen';
import { Screen } from '@/components/Screen';
import { features } from '@/config/features';
import { useAppState } from '@/state/AppState';
import { useTheme } from '@/theme';

export default function Home() {
  const { theme } = useTheme();
  const { durationMinutes, setDurationMinutes, beginSession, sessions } = useAppState();
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
      <View style={styles.hero}>
        <HomeKlumpen
          minutes={durationMinutes}
          onPress={() => setPickerOpen(true)}
          onChange={(next) => {
            setDurationMinutes(next).catch(() => setError('fikk ikke lagret. prøv igjen.'));
          }}
        />
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
        sessionCount={features.aiCard ? sessions.length : undefined}
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
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
