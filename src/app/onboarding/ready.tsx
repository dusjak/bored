import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { knappetrykk } from '@/analytics/track';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { ScreenTitle } from '@/components/ScreenTitle';
import { capitalize, GOAL_LABELS, TIME_PHRASES } from '@/data/mock';
import { confirmedMinutes, summaryLead, summaryTitle } from '@/onboarding/flow';
import { useAppState } from '@/state/AppState';
import { useTheme } from '@/theme';

/** Summary after onboarding. Stays on the session background. */
export default function Ready() {
  const { theme } = useTheme();
  const { user, completeOnboarding, beginSession } = useAppState();
  const minutes = confirmedMinutes(user.duration);
  const goal = user.goal ? GOAL_LABELS[user.goal] : undefined;
  const time = user.time ? TIME_PHRASES[user.time] : undefined;
  const reminderOn = user.notifications === true && Boolean(time);

  const rows = [
    { label: 'Daglig varighet', val: `${minutes} min`, numeric: true },
    { label: 'Påminnelse', val: reminderOn && time ? capitalize(time) : 'Av', numeric: false },
    ...(goal ? [{ label: 'Mål', val: capitalize(goal), numeric: false }] : []),
  ];

  const start = async () => {
    knappetrykk({ type: 'Knapp', navn: 'Start din første økt', hendelse: 'trykk', skjerm: 'Klar' });
    await completeOnboarding();
    await beginSession(minutes);
    router.replace('/home');
    router.push('/session');
  };

  return (
    <Screen session background={theme.color.bg.session} contentStyle={styles.content}>
      <View style={styles.main}>
        <View style={{ marginBottom: 40 }}>
          <ScreenTitle
            variant="display"
            color={theme.color.session['text-primary']}
            style={{ marginBottom: 8 }}
          >
            {summaryTitle(user.name)}
          </ScreenTitle>
          <Text style={[theme.text.body, { color: theme.color.session['text-secondary'] }]}>
            {summaryLead(minutes, time, goal)}
          </Text>
        </View>
        {rows.map((row) => (
          <View key={row.label} style={[styles.row, { borderBottomColor: theme.color.border.strong }]}>
            <Text style={[theme.text.caption, { color: theme.color.session['text-tertiary'] }]}>{row.label}</Text>
            <Text
              style={[
                row.numeric ? theme.text.monoData : theme.text.labelSmall,
                { color: theme.color.session['text-primary'] },
              ]}
            >
              {row.val}
            </Text>
          </View>
        ))}
      </View>

      <Button title="Start din første økt" variant="inverse" onPress={start} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  main: { flex: 1, justifyContent: 'flex-end', paddingBottom: 48 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    minHeight: 44,
  },
});