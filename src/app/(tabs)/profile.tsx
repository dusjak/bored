import { useEffect, useState } from 'react';
import { Alert, AppState, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { AppearanceSheet } from '@/components/AppearanceSheet';
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
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
    Alert.alert(
      'Nullstille alt?',
      'Appen blir som ny på denne telefonen. Alle økter, notater og innstillinger slettes. Dette kan ikke angres.',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Nullstill',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await resetLocalData();
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
      ],
    );
  };

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
                if (result === 'on') setAllowed(true);
                if (result === 'denied') setAllowed(false);
              })
              .catch(() => setError('noe gikk galt. prøv igjen.'));
          }}
        />
      </View>
      {user.notifications === true && !allowed ? (
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
      <AppearanceSheet
        visible={appearanceOpen}
        onClose={() => setAppearanceOpen(false)}
        onError={() => setError('noe gikk galt. prøv igjen.')}
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
