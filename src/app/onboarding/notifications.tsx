import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { pushStep } from '@/onboarding/stepMotion';

import { hasNotificationPermission } from '@/data/notifications';

import { Button } from '@/components/Button';
import { OnboardingHeader } from '@/components/OnboardingHeader';
import { Screen } from '@/components/Screen';
import { Toggle } from '@/components/Toggle';
import { confirmedMinutes, reminderPreviewBody } from '@/onboarding/flow';
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
  const minutes = confirmedMinutes(user.duration);

  return (
    <Screen top="none" contentStyle={{ paddingBottom: 40 }}>
      <OnboardingHeader
        step={6}
        helpGap={4}
        title="En stille påminnelse"
        sub="Ingen lyder. Ingen merker. Bare en enkel melding. Du bestemmer selv om du svarer."
      />

      <View
        style={[
          styles.preview,
          { backgroundColor: theme.color.surface.default, opacity: enabled ? 1 : 0.4 },
        ]}
      >
        <Image source={require('../../../assets/icon/icon-1024.png')} style={styles.icon} />
        <View style={styles.copy}>
          <Text style={[styles.appName, { color: theme.color.text.primary, fontFamily: theme.fonts.sansSemiBold }]}>
            bored.
          </Text>
          <Text style={[theme.text.bodySmall, { color: theme.color.text.primary }]}>
            {reminderPreviewBody(user.name, minutes)}
          </Text>
        </View>
      </View>

      <View style={styles.toggleRow}>
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
        title="Fortsett"
        onPress={() => {
          if (!enabled) void setDailyReminder(false);
          pushStep('/onboarding/ready');
        }}
      />
    </Screen>
  );
}

const ICON = 44;

const styles = StyleSheet.create({
  preview: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: { width: ICON, height: ICON, borderRadius: 10 },
  copy: { flex: 1 },
  appName: { fontSize: 15, lineHeight: 20, marginBottom: 2 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    minHeight: 44,
  },
});
