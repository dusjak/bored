import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { OnboardingHeader } from '@/components/OnboardingHeader';
import { Screen } from '@/components/Screen';
import { Toggle } from '@/components/Toggle';
import { NOTIF_TIME_LABELS } from '@/data/mock';
import { useAppState } from '@/state/AppState';
import { colors, fonts } from '@/theme';

export default function NotificationsStep() {
  const { user, updateUser } = useAppState();
  const [enabled, setEnabled] = useState(user.notifications ?? true);
  const timeLabel = (user.time && NOTIF_TIME_LABELS[user.time]) || 'Daglig';

  return (
    <Screen contentStyle={{ paddingBottom: 40 }}>
      <OnboardingHeader
        step={6}
        title="En stille påminnelse."
        sub="Ingen lyder. Ingen merker. Bare en enkel melding. Du bestemmer selv om du svarer."
      />

      {/* Notification preview */}
      <View style={[styles.preview, { opacity: enabled ? 1 : 0.4 }]}>
        <View style={styles.previewHead}>
          <View style={styles.appIcon}>
            <Text style={styles.appIconText}>b.</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.appName}>bored.</Text>
            <Text style={styles.time}>{timeLabel}</Text>
          </View>
        </View>
        <Text style={styles.message}>
          {user.name ? `${user.name}, ` : ''}Ti minutter. Ingenting skjer her. Det er poenget.
        </Text>
      </View>

      <View style={styles.toggleRow}>
        <View>
          <Text style={styles.toggleLabel}>Skru på varsler</Text>
          <Text style={styles.toggleSub}>Kan skrus av når som helst</Text>
        </View>
        <Toggle value={enabled} onChange={setEnabled} />
      </View>

      <View style={{ flex: 1 }} />
      <Button
        title="Se din oppsummering"
        onPress={() => {
          // TODO: request notification permission + schedule daily nudge (expo-notifications)
          updateUser({ notifications: enabled });
          router.push('/onboarding/ready');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
  },
  previewHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  appIcon: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: colors.fg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appIconText: { color: colors.accent, fontSize: 14, fontFamily: fonts.sansLight },
  appName: { fontFamily: fonts.sansSemiBold, fontSize: 13, color: colors.fg },
  time: { fontFamily: fonts.sansLight, fontSize: 12, color: colors.fgTertiary },
  message: { fontFamily: fonts.sansLight, fontSize: 14, lineHeight: 21, color: colors.fg },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(17,17,16,0.08)',
  },
  toggleLabel: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.fg },
  toggleSub: { fontFamily: fonts.sansLight, fontSize: 12, color: colors.fgTertiary, marginTop: 2 },
});
