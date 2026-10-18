import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { OnboardingHeader } from '@/components/OnboardingHeader';
import { Screen } from '@/components/Screen';
import { Toggle } from '@/components/Toggle';
import { NOTIF_TIME_LABELS } from '@/data/mock';
import { useAppState } from '@/state/AppState';
import { useTheme } from '@/theme';

export default function NotificationsStep() {
  const { theme } = useTheme();
  const { user, updateUser } = useAppState();
  const [enabled, setEnabled] = useState(user.notifications ?? false);
  const timeLabel = (user.time && NOTIF_TIME_LABELS[user.time]) || 'Daglig';

  return (
    <Screen contentStyle={{ paddingBottom: 40 }}>
      <OnboardingHeader
        step={6}
        title="En stille påminnelse."
        sub="Ingen lyder. Ingen merker. Bare en enkel melding. Du bestemmer selv om du svarer."
      />

      <View style={[styles.preview, { backgroundColor: theme.color.surface.default }]}>
        <View style={styles.previewHead}>
          <View style={[styles.appIcon, { backgroundColor: theme.color.ink.default }]}>
            <Text style={[theme.text.labelSmall, { color: theme.color.accent.default }]}>b.</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[theme.text.labelSmall, { color: theme.color.text.primary }]}>bored.</Text>
            <Text style={[theme.text.caption, { color: theme.color.text.tertiary }]}>{timeLabel}</Text>
          </View>
        </View>
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
        <Toggle value={enabled} onChange={setEnabled} accessibilityLabel="Skru på varsler" />
      </View>

      <View style={{ flex: 1 }} />
      <Button
        title="Se din oppsummering"
        onPress={() => {
          updateUser({ notifications: enabled });
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
  previewHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  appIcon: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
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
