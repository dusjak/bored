import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { capitalize, GOAL_LABELS, TIME_PHRASES } from '@/data/mock';
import { useAppState } from '@/state/AppState';
import { colors, em, fonts, onDark } from '@/theme';

/** Summary after onboarding (dark). */
export default function Ready() {
  const { user, completeOnboarding } = useAppState();
  const goal = (user.goal && GOAL_LABELS[user.goal]) || 'mental ro';
  const time = (user.time && TIME_PHRASES[user.time]) || 'om morgenen';
  const dur = user.duration ?? '10';

  const rows = [
    { label: 'Daglig varighet', val: `${dur} min` },
    { label: 'Påminnelse', val: capitalize(time) },
    { label: 'Mål', val: capitalize(goal) },
  ];

  return (
    <Screen dark background={colors.bgInverse} contentStyle={styles.content}>
      <View style={styles.main}>
        <View style={{ marginBottom: 40 }}>
          <Text style={styles.eyebrow}>Klar til å begynne</Text>
          <Text style={styles.title}>{user.name ? `${user.name}, la oss starte.` : 'La oss starte.'}</Text>
          <Text style={styles.summary}>
            Du starter med {dur} minutter {time}, med mål om {goal}.
          </Text>
        </View>
        {rows.map((r) => (
          <View key={r.label} style={styles.row}>
            <Text style={styles.rowLabel}>{r.label}</Text>
            <Text style={styles.rowVal}>{r.val}</Text>
          </View>
        ))}
      </View>

      <View style={{ gap: 4 }}>
        <Button
          title="Start din første økt"
          variant="inverse"
          onPress={() => {
            completeOnboarding();
            router.replace('/home');
            router.push('/session');
          }}
        />
        <Button
          title="Utforsk appen først"
          variant="darkGhost"
          onPress={() => {
            completeOnboarding();
            router.replace('/home');
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 32, paddingTop: 32, paddingBottom: 40 },
  main: { flex: 1, justifyContent: 'flex-end', paddingBottom: 48 },
  eyebrow: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    letterSpacing: em(11, 0.08),
    textTransform: 'uppercase',
    color: onDark.fg28,
    marginBottom: 20,
  },
  title: {
    fontFamily: fonts.serifItalic,
    fontSize: 40,
    lineHeight: 42,
    letterSpacing: em(40, -0.02),
    color: onDark.fg,
    marginBottom: 16,
  },
  summary: { fontFamily: fonts.sansLight, fontSize: 15, lineHeight: 25, color: onDark.fg40 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: onDark.border,
  },
  rowLabel: { fontFamily: fonts.sansLight, fontSize: 13, color: onDark.fg35 },
  rowVal: { fontFamily: fonts.sansMedium, fontSize: 14, color: onDark.fg },
});
