import { useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking, Pressable, StyleSheet, Text, View, type HostInstance } from 'react-native';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
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
  INTEREST_HEADER_LABEL,
  RESET_LOCAL_MESSAGE,
  TRY_AGAIN,
  resetSignedInMessage,
} from '@/backup/copy';
import { knappetrykk, sikkerhetskopiTrykk } from '@/analytics/track';
import { degBackupValue, resetNeedsNetwork, showHonestyLine } from '@/backup/model';
import { deviceIsOnline } from '@/backup/net';
import { ComingTag } from '@/components/backup/ComingTag';
import { AppearanceSheet } from '@/components/AppearanceSheet';
import { TimeWheel } from '@/components/TimeWheel';
import { BottomFade } from '@/components/BottomFade';
import { DurationSheet } from '@/components/DurationSheet';
import { BackupInterestScreen } from '@/components/backup/BackupInterestScreen';
import { RowChevron, SettingsGroup } from '@/components/SettingsGroup';
import { Screen } from '@/components/Screen';
import { Toggle } from '@/components/Toggle';
import { features } from '@/config/features';
import { appearanceLabel, boredSinceLine, durationParts, minutesPhrase, resolveReminderClock } from '@/data/copy';
import { degHeaderLines } from '@/data/sinceLine';
import { reminderIsOn } from '@/data/reminderPolicy';
import { hasNotificationPermission } from '@/data/notifications';
import { useAppState } from '@/state/AppState';
import { useBackup } from '@/state/BackupState';
import { deg } from '@/theme/deg';
import { tabularNums, useTheme } from '@/theme';

/** Deg. Grouped preferences, appearance, backup, then a quiet reset. */
export default function Profile() {
  const { theme, preference, forgetPreference } = useTheme();
  const {
    user,
    durationMinutes,
    setDurationMinutes,
    showCountdown,
    setShowCountdown,
    setDailyReminder,
    setReminderClock,
    refreshDailyReminder,
    resetLocalData,
    beginIntroSplash,
    sessions,
    firstUsedAt,
  } = useAppState();
  const backup = useBackup();
  const durationRef = useRef<HostInstance>(null);
  const appearanceRef = useRef<HostInstance>(null);
  const backupRef = useRef<HostInstance>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reminderOn = reminderIsOn(user.notifications, allowed);
  const clock = resolveReminderClock(user.time, user.reminderClock);
  const since = firstUsedAt ? boredSinceLine(new Date(firstUsedAt)) : null;
  const header = degHeaderLines(user.name, since);
  const duration = durationParts(durationMinutes);
  const canvas = theme.color.bg.grouped;

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

  useEffect(() => {
    if (!reminderOn) setTimeOpen(false);
  }, [reminderOn]);

  const confirmReset = () => {
    void (async () => {
      const needsNetwork =
        backup.mode !== 'off' && backup.mode !== 'fakedoor' && resetNeedsNetwork(backup.preview);
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
            knappetrykk({ type: 'Knapp', navn: 'Nullstill', hendelse: 'submit', skjerm: 'Deg' });
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
                // The splash unmounts the stack. The remount is one fresh route,
                // and index sends launch 'onboarding' to step 1. No navigator call here.
                beginIntroSplash();
              } catch {
                setError('noe gikk galt. prøv igjen.');
              }
            })();
          },
        },
      ]);
    })();
  };

  const fakedoor = backup.mode === 'fakedoor';
  const backupValue = degBackupValue(backup.mode, backup.preview);
  const backupLabel =
    backupValue === 'on' ? DEG_ON : backupValue === 'onTest' ? DEG_ON_TEST : backupValue === 'stale' ? DEG_STALE : DEG_OFF;
  const honesty = showHonestyLine(backup.mode, backup.preview);
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const label = [theme.text.body, styles.rowLabel, { color: theme.color.text.primary }];
  const value = [theme.text.body, styles.rowValue, { color: theme.color.text.tertiary }];
  const closeTime = () => setTimeOpen(false);

  return (
    <View style={[styles.fill, { backgroundColor: canvas }]}>
      <Screen scroll edges={['top']} top="none" background={canvas} contentStyle={styles.content}>
        {header.name || header.since ? (
          <Pressable accessible={false} onPress={closeTime}>
            {header.name ? (
              <Text
                style={[
                  styles.title,
                  {
                    fontFamily: theme.fonts.serif,
                    color: theme.color.text.primary,
                    marginBottom: header.since ? 0 : deg.afterTitle,
                  },
                ]}
              >
                {header.name}
              </Text>
            ) : null}
            {header.since ? (
              <Text
                style={[
                  styles.since,
                  !header.name && styles.sinceAlone,
                  { fontFamily: theme.fonts.sans, color: theme.color.text.tertiary },
                ]}
              >
                {header.since}
              </Text>
            ) : null}
          </Pressable>
        ) : null}

        <View style={styles.groups}>
          <SettingsGroup>
            <Pressable
              ref={durationRef}
              accessibilityRole="button"
              accessibilityLabel={`Foretrukket varighet, ${minutesPhrase(durationMinutes)}`}
              onPress={() => {
                closeTime();
                setPickerOpen(true);
              }}
              style={styles.row}
            >
              <Text style={label}>Foretrukket varighet</Text>
              <View style={styles.trailing}>
                <Text style={value}>
                  <Text style={styles.figure}>{duration.value}</Text>
                  {` ${duration.unit}`}
                </Text>
                <DegChevron />
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="switch"
              accessibilityLabel="Vis nedtelling"
              accessibilityState={{ checked: showCountdown }}
              onPress={() => {
                closeTime();
                void Haptics.selectionAsync();
                setShowCountdown(!showCountdown).catch(() => setError('noe gikk galt. prøv igjen.'));
              }}
              style={styles.row}
            >
              <Text style={label}>Vis nedtelling</Text>
              <Toggle embedded value={showCountdown} />
            </Pressable>
          </SettingsGroup>

          <SettingsGroup
            footer={
              allowed ? null : (
                <View>
                  <Text style={[theme.text.caption, { color: theme.color.text.tertiary }]}>
                    Varsler er slått av for appen.
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Åpne Innstillinger"
                    hitSlop={{ top: 13, bottom: 13, left: 4, right: 4 }}
                    onPress={() => Linking.openSettings()}
                    style={styles.linkHit}
                  >
                    <Text style={[theme.text.eyebrow, { color: theme.color.text.link }]}>Åpne Innstillinger</Text>
                  </Pressable>
                </View>
              )
            }
          >
            <Pressable
              accessibilityRole="switch"
              accessibilityLabel="Daglig påminnelse"
              accessibilityState={{ checked: reminderOn }}
              onPress={() => {
                closeTime();
                void Haptics.selectionAsync();
                setDailyReminder(!reminderOn)
                  .then((result) => {
                    if (result === 'off') void backup.clearRestoreNotificationLine();
                    if (result === 'on') setAllowed(true);
                    if (result === 'denied') setAllowed(false);
                  })
                  .catch(() => setError('noe gikk galt. prøv igjen.'));
              }}
              style={styles.row}
            >
              <Text style={label}>Daglig påminnelse</Text>
              <Toggle embedded value={reminderOn} />
            </Pressable>
            {reminderOn ? (
              <View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Tidspunkt, ${clock.label}`}
                  accessibilityState={{ expanded: timeOpen }}
                  onPress={() => setTimeOpen((open) => !open)}
                  style={styles.row}
                >
                  <Text style={label}>Tidspunkt</Text>
                  <View
                    style={[
                      styles.capsule,
                      { backgroundColor: theme.color.control.capsule },
                    ]}
                  >
                    <Text
                      style={[
                        theme.text.body,
                        styles.capsuleText,
                        { color: timeOpen ? theme.color.accent.default : theme.color.text.primary },
                      ]}
                    >
                      {clock.label}
                    </Text>
                  </View>
                </Pressable>
                <TimeWheel
                  open={timeOpen}
                  hour={clock.hour}
                  minute={clock.minute}
                  onChange={(hour, minute) => {
                    if (hour === clock.hour && minute === clock.minute) return;
                    setReminderClock(hour, minute).catch(() => setError('noe gikk galt. prøv igjen.'));
                  }}
                />
              </View>
            ) : null}
          </SettingsGroup>

          <SettingsGroup>
            <Pressable
              ref={appearanceRef}
              accessibilityRole="button"
              accessibilityLabel={`Utseende, ${appearanceLabel(preference)}`}
              onPress={() => {
                closeTime();
                setAppearanceOpen(true);
              }}
              style={styles.row}
            >
              <Text style={label}>Utseende</Text>
              <View style={styles.trailing}>
                <Text style={value}>{appearanceLabel(preference)}</Text>
                <DegChevron />
              </View>
            </Pressable>
          </SettingsGroup>

          {backupValue !== 'hidden' ? (
            <SettingsGroup
              footer={
                honesty ? (
                  <Text style={[theme.text.caption, { color: theme.color.text.tertiary }]}>{HONESTY_LINE}</Text>
                ) : null
              }
            >
              <Pressable
                ref={backupRef}
                accessibilityRole="button"
                accessibilityLabel={fakedoor ? INTEREST_HEADER_LABEL : `Sikkerhetskopi, ${backupLabel}`}
                onPress={() => {
                  sikkerhetskopiTrykk({
                    knapp: 'sikkerhetskopi_aapne',
                    kilde: 'deg',
                    skjerm: 'Deg',
                    hendelse: 'åpner',
                    navn: 'Sikkerhetskopi',
                  });
                  closeTime();
                  setBackupOpen(true);
                }}
                style={styles.row}
              >
                <Text style={label}>Sikkerhetskopi</Text>
                <View style={styles.trailing}>
                  {fakedoor ? <ComingTag variant="row" /> : <Text style={value}>{backupLabel}</Text>}
                  <DegChevron />
                </View>
              </Pressable>
            </SettingsGroup>
          ) : null}
        </View>

        {error ? (
          <Text style={[theme.text.caption, { color: theme.color.text.secondary, marginTop: theme.space['4'] }]}>
            {error}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Nullstill"
          onPress={() => {
            knappetrykk({ type: 'Knapp', navn: 'Nullstill', hendelse: 'åpner', skjerm: 'Deg' });
            closeTime();
            confirmReset();
          }}
          style={styles.reset}
        >
          <Text style={[theme.text.body, styles.rowLabel, { color: theme.color.text.destructive }]}>Nullstill</Text>
        </Pressable>

        <View accessibilityLabel={`Versjon ${version}`} style={styles.version}>
          <Text style={[theme.text.caption, styles.versionText, { color: theme.color.text.meta }]}>{version}</Text>
        </View>
      </Screen>
      <BottomFade color={canvas} />

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
      <AppearanceSheet
        visible={appearanceOpen}
        onClose={() => setAppearanceOpen(false)}
        onError={() => setError('noe gikk galt. prøv igjen.')}
        returnFocusRef={appearanceRef}
      />
      <BackupInterestScreen
        visible={backupOpen}
        kilde="deg"
        onClose={() => setBackupOpen(false)}
        returnFocusRef={backupRef}
      />
    </View>
  );
}

function DegChevron() {
  return (
    <View style={styles.chevron}>
      <RowChevron />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingTop: deg.titleTop, paddingBottom: 160 },
  title: {
    fontSize: deg.titleSize,
    lineHeight: deg.titleLine,
  },
  since: {
    marginTop: deg.sinceGap,
    marginBottom: deg.sinceToGroup,
    fontSize: deg.sinceSize,
    lineHeight: deg.sinceLineHeight,
  },
  /** The 8 pt gap is only the space under a name. A skipped name does not invent one. */
  sinceAlone: { marginTop: 0 },
  groups: { gap: deg.groupGap },
  row: {
    height: deg.rowMinHeight,
    paddingHorizontal: deg.rowInset,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: 12,
  },
  rowLabel: {
    fontSize: deg.rowSize,
    lineHeight: deg.rowLine,
    flexGrow: 1,
    flexShrink: 1,
    transform: [{ translateY: deg.rowTextShift }],
  },
  rowValue: {
    fontSize: deg.rowSize,
    lineHeight: deg.rowLine,
    transform: [{ translateY: deg.rowTextShift }],
  },
  figure: { fontVariant: tabularNums },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: '100%' },
  chevron: { transform: [{ translateY: deg.rowTextShift }] },
  capsule: {
    minHeight: deg.capsuleHeight,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capsuleText: {
    fontSize: deg.rowSize,
    lineHeight: deg.rowLine,
    fontVariant: tabularNums,
    transform: [{ translateY: deg.rowTextShift }],
  },
  // Touch target grows with hitSlop. A 32 pt min height would push the next card 14 pt too far.
  linkHit: { alignSelf: 'flex-start', justifyContent: 'center' },
  reset: {
    marginTop: deg.resetGap,
    minHeight: deg.resetMinHeight,
    paddingHorizontal: deg.rowInset,
    justifyContent: 'center',
  },
  version: { marginTop: deg.versionGap, alignItems: 'center', justifyContent: 'center' },
  versionText: { textAlign: 'center' },
});
