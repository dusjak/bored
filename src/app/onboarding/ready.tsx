import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { ScreenTitle } from '@/components/ScreenTitle';
import { capitalize, GOAL_LABELS, TIME_PHRASES } from '@/data/mock';
import { useAppState } from '@/state/AppState';
import { useTheme } from '@/theme';

/** Summary after onboarding. Stays on the session background. */
export default function Ready() {
  const { theme } = useTheme();
  const { user, completeOnboarding, beginSession } = useAppState();
  const goal = (user.goal && GOAL_LABELS[user.goal]) || 'mental ro';
  const time = (user.time && TIME_PHRASES[user.time]) || 'om morgenen';
  const dur = user.duration ?? '10';

  const rows = [
    { label: 'Daglig varighet', val: `${dur} min` },
    { label: 'Påminnelse', val: user.notifications === false ? 'Av' : capitalize(time) },
    { label: 'Mål', val: capitalize(goal) },
  ];

  const start = async () => {
    await completeOnboarding();
    await beginSession(parseInt(dur, 10) || 10);
    router.replace('/home');
    router.push('/session');
  };

  return (
    <Screen session background={theme.color.bg.session} contentStyle={styles.content}>
      <View style={styles.main}>
        <View style={{ marginBottom: 40 }}>
          <Text style={[theme.text.eyebrow, { color: theme.color.session['text-tertiary'], marginBottom: 20 }]}>
            Klar til å begynne
          </Text>
          <ScreenTitle
            variant="display"
            color={theme.color.session['text-primary']}
            style={{ marginBottom: 16 }}
          >
            {user.name ? `${user.name}, la oss starte.` : 'La oss starte.'}
          </ScreenTitle>
          <Text style={[theme.text.body, { color: theme.color.session['text-secondary'] }]}>
            Du starter med {dur} minutter {time}, med mål om {goal}.
          </Text>
        </View>
        {rows.map((row) => (
          <View key={row.label} style={[styles.row, { borderBottomColor: theme.color.border.strong }]}>
            <Text style={[theme.text.caption, { color: theme.color.session['text-tertiary'] }]}>{row.label}</Text>
            <Text style={[theme.text.labelSmall, { color: theme.color.session['text-primary'] }]}>{row.val}</Text>
          </View>
        ))}
      </View>

      <View style={{ gap: 4 }}>
        <Button title="Start din første økt" variant="inverse" onPress={start} />
        <Button
          title="Utforsk appen først"
          variant="darkGhost"
          onPress={async () => {
            await completeOnboarding();
            router.replace('/home');
          }}
        />
      </View>
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