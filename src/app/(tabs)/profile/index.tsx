import { useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';

import {
  ALERT_OFFLINE,
  ALERT_OFFLINE_RESET,
  ALERT_RESET,
  ALERT_RESET_FAILED,
  ALERT_RESET_FAILED_BODY,
  CONFIRM_CANCEL,
  CONFIRM_OK,
  CONFIRM_RESET,
  DEG_OFF,
  DEG_ON,
  DEG_ON_TEST,
  DEG_STALE,
  HONESTY_LINE,
  NOTIFICATIONS_OFF_LINE,
  RESET_LOCAL_MESSAGE,
  TRY_AGAIN,
  resetSignedInMessage,
} from '@/backup/copy';
import { degBackupValue, resetNeedsNetwork, showHonestyLine, type PreviewForce } from '@/backup/model';
import { deviceIsOnline } from '@/backup/net';
import { AppearanceSheet } from '@/components/AppearanceSheet';
import { PreviewStateSheet } from '@/components/backup/PreviewStateSheet';
import { Button } from '@/components/Button';
import { DurationSheet } from '@/components/DurationSheet';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { ScreenTitle } from '@/components/ScreenTitle';
import { Toggle } from '@/components/Toggle';
import { features } from '@/config/features';
import { appearanceLabel, durationParts, minutesPhrase, reminderSchedule } from '@/data/copy';
import { hasNotificationPermission } from '@/data/notifications';
import { useAppState } from '@/state/AppState';
import { useBackup } from '@/state/BackupState';
import { fonts, screenHeaderInset, useTheme } from '@/theme';

/** Deg. Preferences, appearance, then a full reset. */
export default function Profile() {
  const { theme, preference, forgetPreference } = useTheme();
  const {
    user,
    durationMinutes,
    setDurationMinutes,
    showCountdown,
    setShowCountdown,
    setDailyReminder,
    refreshDailyReminder,
    resetLocalData,
    beginIntroSplash,
    sessions,
  } = useAppState();
  const backup = useBackup();
  const versionTaps = useRef(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [previewMenu, setPreviewMenu] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reminderOn = user.notifications === true && allowed;
  const clock = reminderSchedule(user.time);
  const duration = durationParts(durationMinutes);

  useEffect(() => {
    const check = () => {
      hasNotificationPermission().then(setAllowed).catch(() => setAllowed(false));
      refreshDailyReminder().catch(() => undefined);
    };
    check();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') check();
    });
    return () => sub.remove();
  }, [refreshDailyReminder]);

  const confirmReset = () => {
    void (async () => {
      const needsNetwork = backup.mode !== 'off' && resetNeedsNetwork(backup.preview);
      if (needsNetwork && !(await deviceIsOnline())) {
        Alert.alert(ALERT_OFFLINE, ALERT_OFFLINE_RESET, [{ text: CONFIRM_OK }]);
        return;
      }
      Alert.alert(ALERT_RESET, needsNetwork ? resetSignedInMessage(backup.mode) : RESET_LOCAL_MESSAGE, [
        { text: CONFIRM_CANCEL, style: 'cancel' },
        {
          text: CONFIRM_RESET,
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                if (needsNetwork && !(await deviceIsOnline())) {
                  Alert.alert(ALERT_OFFLINE, ALERT_OFFLINE_RESET, [{ text: CONFIRM_OK }]);
                  return;
                }
                if (needsNetwork) {
                  const cloud = await backup.prepareReset();
                  if (cloud === 'failed') {
                    Alert.alert(ALERT_RESET_FAILED, ALERT_RESET_FAILED_BODY, [
                      { text: CONFIRM_CANCEL, style: 'cancel' },
                      { text: TRY_AGAIN, onPress: () => confirmReset() },
                    ]);
                    return;
                  }
                }
                await resetLocalData();
                backup.forget();
                forgetPreference();
                beginIntroSplash();
                if (router.canDismiss()) router.dismissAll();
                router.replace('/onboarding');
              } catch {
                setError('noe gikk galt. prøv igjen.');
              }
            })();
          },
        },
      ]);
    })();
  };

  const backupValue = degBackupValue(backup.mode, backup.preview);
  const backupLabel =
    backupValue === 'on' ? DEG_ON : backupValue === 'onTest' ? DEG_ON_TEST : backupValue === 'stale' ? DEG_STALE : DEG_OFF;
  const honesty = showHonestyLine(backup.mode, backup.preview);
  const restoreDenied =
    backup.preview.notificationsDeniedAfterRestore && user.notifications === true && !allowed;
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen scroll edges={['top']} contentStyle={styles.content}>
      {user.name ? <ScreenTitle style={{ marginBottom: theme.space['6'] }}>{user.name}</ScreenTitle> : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Foretrukket varighet, ${minutesPhrase(durationMinutes)}`}
        onPress={() => setPickerOpen(true)}
        style={[styles.row, { borderBottomColor: theme.color.border.default }]}
      >
        <Text style={[theme.text.label, { color: theme.color.text.primary }]}>Foretrukket varighet</Text>
        <View style={styles.rowRight}>
          <Text style={[theme.text.bodySmall, { color: theme.color.text.secondary }]}>
            <Text style={styles.monoFigure}>{duration.value}</Text>
            {` ${duration.unit}`}
          </Text>
          <Icon name="chevronRight" size={16} color={theme.color.text.tertiary} />
        </View>
      </Pressable>

      <View
        style={[
          styles.row,
          {
            borderBottomColor: theme.color.border.default,
            paddingVertical: theme.space['3'],
          },
        ]}
      >
        <View style={styles.reminderCopy}>
          <Text style={[theme.text.label, { color: theme.color.text.primary }]}>Daglig påminnelse</Text>
          {reminderOn ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={clock.label}
              hitSlop={12}
              onPress={() => {
                // No time picker yet. hitSlop keeps a 44pt target until one exists.
              }}
              style={[styles.reminderTime, { marginTop: theme.space['1'], gap: theme.space['2'] }]}
            >
              <Text style={[styles.monoFigure, { color: theme.color.text.secondary }]}>{clock.label}</Text>
              <Icon name="chevronRight" size={16} color={theme.color.text.tertiary} />
            </Pressable>
          ) : null}
        </View>
        <Toggle
          value={reminderOn}
          accessibilityLabel="Daglig påminnelse"
          onChange={(next) => {
            setDailyReminder(next)
              .then((result) => {
                if (!next) void backup.clearRestoreNotificationLine();
                if (result === 'on') setAllowed(true);
                if (result === 'denied') setAllowed(false);
              })
              .catch(() => setError('noe gikk galt. prøv igjen.'));
          }}
        />
      </View>
      {restoreDenied ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={NOTIFICATIONS_OFF_LINE}
          onPress={() => Linking.openSettings()}
          style={{ marginTop: theme.space['3'], marginBottom: theme.space['2'], minHeight: 44, justifyContent: 'center' }}
        >
          <Text style={[theme.text.caption, { color: theme.color.text.secondary }]}>{NOTIFICATIONS_OFF_LINE}</Text>
        </Pressable>
      ) : user.notifications === true && !allowed ? (
        <View style={{ marginTop: theme.space['3'], marginBottom: theme.space['2'] }}>
          <Text style={[theme.text.caption, { color: theme.color.text.secondary }]}>
            Varsler er slått av for bored. Du kan slå dem på i Innstillinger.
          </Text>
          <Button
            title="Åpne Innstillinger"
            variant="secondary"
            size="compact"
            onPress={() => Linking.openSettings()}
            style={{ alignSelf: 'flex-start', marginTop: theme.space['3'] }}
          />
        </View>
      ) : null}

      <View style={[styles.row, { borderBottomColor: theme.color.border.default }]}>
        <Text style={[theme.text.label, { color: theme.color.text.primary }]}>Vis nedtelling</Text>
        <Toggle
          value={showCountdown}
          accessibilityLabel="Vis nedtelling"
          onChange={(next) => {
            setShowCountdown(next).catch(() => setError('noe gikk galt. prøv igjen.'));
          }}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Utseende, ${appearanceLabel(preference)}`}
        onPress={() => setAppearanceOpen(true)}
        style={[styles.row, { borderBottomColor: theme.color.border.default }]}
      >
        <Text style={[theme.text.label, { color: theme.color.text.primary }]}>Utseende</Text>
        <View style={styles.rowRight}>
          <Text style={[theme.text.bodySmall, { color: theme.color.text.secondary }]}>{appearanceLabel(preference)}</Text>
          <Icon name="chevronRight" size={16} color={theme.color.text.tertiary} />
        </View>
      </Pressable>

      {backupValue !== 'hidden' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Sikkerhetskopi, ${backupLabel}`}
          onPress={() => router.push('/profile/backup')}
          style={[styles.row, { borderBottomColor: theme.color.border.default }]}
        >
          <Text style={[theme.text.label, { color: theme.color.text.primary }]}>Sikkerhetskopi</Text>
          <View style={styles.rowRight}>
            <Text style={[theme.text.bodySmall, { color: theme.color.text.secondary }]}>{backupLabel}</Text>
            <Icon name="chevronRight" size={16} color={theme.color.text.tertiary} />
          </View>
        </Pressable>
      ) : null}
      {honesty ? (
        <Text style={[theme.text.caption, { color: theme.color.text.secondary, marginTop: theme.space['2'] }]}>
          {HONESTY_LINE}
        </Text>
      ) : null}

      {error ? (
        <Text style={[theme.text.caption, { color: theme.color.text.secondary, marginTop: theme.space['4'] }]}>{error}</Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Nullstill"
        onPress={confirmReset}
        style={[styles.reset, { marginTop: theme.space['10'] }]}
      >
        <Text style={[theme.text.label, { color: theme.color.text.destructive }]}>Nullstill</Text>
      </Pressable>

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
      {backup.mode === 'preview' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Versjon ${version}`}
          onPress={() => {
            versionTaps.current += 1;
            if (versionTaps.current >= 5) {
              versionTaps.current = 0;
              setPreviewMenu(true);
            }
          }}
          style={{ marginTop: theme.space['10'], minHeight: 44, justifyContent: 'center' }}
        >
          <Text style={[theme.text.caption, { color: theme.color.text.tertiary }]}>{version}</Text>
        </Pressable>
      ) : null}

      <AppearanceSheet
        visible={appearanceOpen}
        onClose={() => setAppearanceOpen(false)}
        onError={() => setError('noe gikk galt. prøv igjen.')}
      />
      <PreviewStateSheet
        visible={previewMenu}
        onClose={() => setPreviewMenu(false)}
        onPick={(screen: PreviewForce | null) => {
          void backup.forcePreview(screen).then(() => {
            setPreviewMenu(false);
            if (screen) router.push('/profile/backup');
          });
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 140, paddingTop: screenHeaderInset },
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reminderCopy: { flex: 1, paddingRight: 12 },
  reminderTime: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  monoFigure: {
    fontFamily: fonts.mono,
    fontSize: 14,
    lineHeight: 20,
    fontVariant: ['tabular-nums'],
  },
  reset: { minHeight: 44, justifyContent: 'center' },
});
