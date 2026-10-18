import { StyleSheet, Text, View } from 'react-native';

import { RecentSessions } from '@/components/RecentSessions';
import { Screen } from '@/components/Screen';
import { WEEKDAYS } from '@/data/mock';
import { useAppState } from '@/state/AppState';
import { colors, em, fonts, palette, shadow, type } from '@/theme';

/** Progress dashboard + reflection journal ("Logg"). */
export default function Log() {
  const { stats, sessions } = useAppState();
  const max = Math.max(1, ...stats.week);

  const cards = [
    { label: 'Totale økter', value: String(stats.totalSessions) },
    { label: 'Snitt lengde', value: `${stats.avgMinutes} min` },
    { label: 'Denne uken', value: `${stats.weekMinutes} min` },
  ];

  return (
    <Screen scroll edges={['top']} contentStyle={{ paddingTop: 8, paddingBottom: 40 }}>
      <View style={{ marginBottom: 24 }}>
        <Text style={[type.eyebrow, { marginBottom: 6 }]}>Din utvikling</Text>
        <Text style={styles.headline}>{stats.streakDays} dager på rad</Text>
        <Text style={styles.record}>Rekord: {stats.recordStreak} dager</Text>
      </View>

      <View style={styles.cards}>
        {cards.map((c) => (
          <View key={c.label} style={styles.card}>
            <Text style={styles.cardValue}>{c.value}</Text>
            <Text style={styles.cardLabel}>{c.label}</Text>
          </View>
        ))}
      </View>

      <View style={{ marginBottom: 32 }}>
        <Text style={[type.eyebrow, { marginBottom: 12 }]}>Denne uken — minutter</Text>
        <View style={styles.chart}>
          {stats.week.map((m, i) => (
            <View key={WEEKDAYS[i]} style={styles.barCol}>
              <View
                style={[
                  styles.bar,
                  { height: m ? (m / max) * 56 : 3, backgroundColor: m ? colors.fg : palette.mono300 },
                ]}
              />
              <Text style={styles.barLabel}>{WEEKDAYS[i]}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* TODO: mood trend + AI insights over time (from the pitch) are not in the design yet */}
      <RecentSessions sessions={sessions} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headline: { fontFamily: fonts.sansMedium, fontSize: 22, letterSpacing: em(22, -0.02), color: colors.fg },
  record: { fontFamily: fonts.sansLight, fontSize: 12, color: colors.fgTertiary, marginTop: 2 },
  cards: { flexDirection: 'row', gap: 8, marginBottom: 28 },
  card: { flex: 1, backgroundColor: colors.card, paddingVertical: 14, paddingHorizontal: 12, ...shadow[1] },
  cardValue: { fontFamily: fonts.sansMedium, fontSize: 22, letterSpacing: em(22, -0.03), color: colors.fg },
  cardLabel: { fontFamily: fonts.sans, fontSize: 10, color: colors.fgTertiary, marginTop: 3 },
  chart: { flexDirection: 'row', gap: 5, alignItems: 'flex-end', height: 72 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 5, height: '100%' },
  bar: { width: '100%', borderTopLeftRadius: 1, borderTopRightRadius: 1 },
  barLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 9,
    letterSpacing: em(9, 0.04),
    textTransform: 'uppercase',
    color: palette.mono500,
  },
});
