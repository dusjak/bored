import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, type HostInstance } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { DurationSheet } from '@/components/DurationSheet';
import { HomeUnease } from '@/components/HomeUnease';
import { HomeKlumpen } from '@/components/Klumpen';
import { Screen } from '@/components/Screen';
import { features } from '@/config/features';
import { HOME_UNEASE_LATCH, getSetting, setSetting } from '@/data/repository';
import { defaultMaterial, homeUneaseState, type EndedSession } from '@/onboarding/flow';
import { useAppState } from '@/state/AppState';
import { useTheme } from '@/theme';

export default function Home() {
  const { theme } = useTheme();
  const { durationMinutes, setDurationMinutes, beginSession, sessions, user } = useAppState();
  const [pickerOpen, setPickerOpen] = useState(false);
  const durationRef = useRef<HostInstance>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [unease, setUnease] = useState(false);

  useEffect(() => {
    let live = true;
    const ended: EndedSession[] = sessions.flatMap((session) => {
      if ((session.status !== 'completed' && session.status !== 'aborted') || !session.endedAt) return [];
      return [{ id: session.id, status: session.status, endedAt: session.endedAt }];
    });
    void getSetting(HOME_UNEASE_LATCH).then((stored) => {
      if (!live) return;
      const state = homeUneaseState(user.introPath, ended, stored === '1');
      if (state.latch && stored !== '1') void setSetting(HOME_UNEASE_LATCH, '1');
      setUnease(state.show);
    });
    return () => {
      live = false;
    };
  }, [sessions, user.introPath]);

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
          material={defaultMaterial(user.materialId)}
          formOffsets={user.forms?.[defaultMaterial(user.materialId)] ?? null}
          onPress={() => setPickerOpen(true)}
          focusRef={durationRef}
          onChange={(next) => {
            setDurationMinutes(next).catch(() => setError('fikk ikke lagret. prøv igjen.'));
          }}
        />
      </View>

      {error ? (
        <Text style={[theme.text.caption, { color: theme.color.text.secondary, marginBottom: theme.space['3'] }]}>{error}</Text>
      ) : null}
      <View>
        {unease ? (
          <View style={styles.unease} pointerEvents="box-none">
            <HomeUnease />
          </View>
        ) : null}
        <Button
          title="Start"
          size="comfort"
          accessibilityLabel="Start økt"
          disabled={starting}
          onPress={start}
          style={{ marginBottom: theme.space['4'] }}
        />
      </View>

      <DurationSheet
        visible={pickerOpen}
        current={durationMinutes}
        sessionCount={features.aiCard ? sessions.length : undefined}
        onUse={(minutes) => {
          setDurationMinutes(minutes).catch(() => setError('fikk ikke lagret. prøv igjen.'));
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
        returnFocusRef={durationRef}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 120 },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  unease: { position: 'absolute', left: 0, right: 0, bottom: '100%' },
});
