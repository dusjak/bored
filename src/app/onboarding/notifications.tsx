import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { hasNotificationPermission } from '@/data/notifications';

import { Button } from '@/components/Button';
import { OnboardingHeader } from '@/components/OnboardingHeader';
import { Screen } from '@/components/Screen';
import { Toggle } from '@/components/Toggle';
import { NOTIF_TIME_LABELS } from '@/data/mock';
import { useAppState } from '@/state/AppState';
import { useTheme } from '@/theme';

export default function NotificationsStep() {
  const { theme } = useTheme();
  const { user, setDailyReminder } = useAppState();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let live = true;
    void hasNotificationPermission().then((allowed) => {
      if (live) setEnabled(user.notifications === true && allowed);
    });
    return () => {
      live = false;
    };
  }, [user.notifications]);

  const change = async (next: boolean) => {
    if (!next) {
      setEnabled(false);
      await setDailyReminder(false);
      return;
    }
    const result = await setDailyReminder(true);
    if (result === 'on') {
      setEnabled(true);
      return;
    }
    setEnabled(false);
    await setDailyReminder(false);
  };
  const timeLabel = (user.time && NOTIF_TIME_LABELS[user.time]) || 'Daglig';

  return (
    <Screen top="none" contentStyle={{ paddingBottom: 40 }}>
      <OnboardingHeader
        step={5}
        helpGap={4}
        title="En stille påminnelse."
        sub="Ingen lyder. Ingen merker. Bare en enkel melding. Du bestemmer selv om du svarer."
      />

      <View style={[styles.preview, { backgroundColor: theme.color.surface.default }]}>
        <Text style={[theme.text.monoMeta, { color: theme.color.text.tertiary, marginBottom: 8 }]}>{timeLabel}</Text>
        <Text style={[theme.text.bodySmall, { color: theme.color.text.primary }]}>
          {user.name ? `${user.name}, ` : ''}Ti minutter. Ingenting skjer her. Det er poenget.
        </Text>
      </View>

      <View style={[styles.toggleRow, { borderColor: theme.color.border.default }]}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={[theme.text.label, { color: theme.color.text.primary }]}>Skru på varsler</Text>
          <Text style={[theme.text.caption, { color: theme.color.text.tertiary, marginTop: 2 }]}>
            Kan skrus av når som helst
          </Text>
        </View>
        <Toggle value={enabled} onChange={(next) => void change(next)} accessibilityLabel="Skru på varsler" />
      </View>

      <View style={{ flex: 1 }} />
      <Button
        title="Se din oppsummering"
        onPress={() => {
          if (!enabled) void setDailyReminder(false);
          router.push('/onboarding/ready');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    minHeight: 44,
  },
});
