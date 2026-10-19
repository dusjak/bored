import { useEffect, useState } from 'react';
import { Alert, AppState, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { DurationSheet } from '@/components/DurationSheet';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Toggle } from '@/components/Toggle';
import { minutesPhrase, reminderSchedule } from '@/data/copy';
import { hasNotificationPermission } from '@/data/notifications';
import { useAppState } from '@/state/AppState';
import { useTheme, type ThemePreference } from '@/theme';

const APPEARANCE: { id: ThemePreference; label: string }[] = [
  { id: 'light', label: 'Lys' },
  { id: 'dark', label: 'Mørk' },
  { id: 'system', label: 'Automatisk' },
];

/** Deg. Preferences, appearance, then a full reset. */
export default function Profile() {
  const { theme, preference, setPreference, forgetPreference } = useTheme();
  const {
    user,
    durationMinutes,
    setDurationMinutes,
    showCountdown,
    setShowCountdown,
    setDailyReminder,
    refreshDailyReminder,
    resetLocalData,
  } = useAppState();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reminderOn = user.notifications === true && allowed;
  const clock = reminderSchedule(user.time);
  const destructive = theme.name === 'dark' ? '#FFB4AB' : '#9F2D2D';

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
      {user.name ? (
        <Text style={[theme.text.headline, { color: theme.color.text.primary, marginBottom: theme.space['6'] }]}>
          {user.name}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Foretrukket varighet, ${minutesPhrase(durationMinutes)}`}
        onPress={() => setPickerOpen(true)}
        style={[styles.row, { borderBottomColor: theme.color.border.default }]}
      >
        <Text style={[theme.text.label, { color: theme.color.text.primary }]}>Foretrukket varighet</Text>
        <View style={styles.rowRight}>
          <Text style={[theme.text.bodySmall, { color: theme.color.text.secondary }]}>{minutesPhrase(durationMinutes)}</Text>
          <Icon name="chevronRight" size={16} color={theme.color.text.tertiary} />
        </View>
      </Pressable>

      <View style={[styles.row, { borderBottomColor: theme.color.border.default }]}>
        <Text style={[theme.text.label, { color: theme.color.text.primary }]}>Daglig påminnelse</Text>
        <View style={styles.rowRight}>
          <Text style={[theme.text.bodySmall, { color: theme.color.text.secondary }]}>{reminderOn ? clock.label : 'Av'}</Text>
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
      </View>
      {user.notifications === true && !allowed ? (
        <View style={{ marginTop: theme.space['3'], marginBottom: theme.space['2'] }}>
          <Text style={[theme.text.caption, { color: theme.color.text.secondary }]}>
            Varsler er slått av for bored. Du kan slå dem på i Innstillinger.
          </Text>
          <Button
            title="Åpne Innstillinger"
            variant="tertiary"
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

      <Text style={[theme.text.eyebrow, { color: theme.color.text.tertiary, marginTop: theme.space['8'], marginBottom: theme.space['2'] }]}>
        Utseende
      </Text>
      {APPEARANCE.map((option, index) => {
        const selected = preference === option.id;
        const last = index === APPEARANCE.length - 1;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => {
              setPreference(option.id).catch(() => setError('noe gikk galt. prøv igjen.'));
            }}
            style={[styles.row, { borderBottomWidth: last ? 0 : 1, borderBottomColor: theme.color.border.default }]}
          >
            <Text style={[theme.text.label, { color: theme.color.text.primary }]}>{option.label}</Text>
            {selected ? <Icon name="check" size={18} color={theme.color.ink.default} /> : <View style={styles.checkSpace} />}
          </Pressable>
        );
      })}
      <Text style={[theme.text.caption, { color: theme.color.text.tertiary, marginTop: theme.space['2'] }]}>
        Automatisk følger telefonen.
      </Text>

      <View style={{ marginTop: theme.space['10'] }}>
        <Text style={[theme.text.eyebrow, { color: theme.color.text.tertiary, marginBottom: theme.space['4'] }]}>Om bored.</Text>
        <View style={[styles.quote, { borderLeftColor: theme.color.border.default }]}>
          <Text style={[theme.text.bodySmall, { color: theme.color.text.secondary }]}>
            «Kjedsomhet er drømmefuglen som ruger ut erfaringens egg.»
          </Text>
          <Text style={[theme.text.caption, { color: theme.color.text.tertiary, marginTop: theme.space['2'] }]}>
            — Walter Benjamin
          </Text>
        </View>
      </View>

      {error ? (
        <Text style={[theme.text.caption, { color: theme.color.text.secondary, marginTop: theme.space['4'] }]}>{error}</Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Nullstill"
        onPress={confirmReset}
        style={[styles.reset, { marginTop: theme.space['10'] }]}
      >
        <Text style={[theme.text.label, { color: destructive }]}>Nullstill</Text>
      </Pressable>

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
  content: { paddingBottom: 140 },
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkSpace: { width: 18 },
  quote: { borderLeftWidth: 2, paddingLeft: 16 },
  reset: { minHeight: 44, justifyContent: 'center' },
});
