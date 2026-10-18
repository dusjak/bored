import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { MOCK_STATS, REMINDER_CLOCK } from '@/data/mock';
import { useAppState } from '@/state/AppState';
import { colors, em, fonts, palette, type } from '@/theme';

/** Profile ("Deg"): preferences and about. */
export default function Profile() {
  const { user, activeDuration } = useAppState();
  const name = user.name || 'Deg';
  const reminder = (user.time && REMINDER_CLOCK[user.time]) || '08:00';

  // TODO: settings rows are display-only; no edit screens yet
  const settings = [
    { label: 'Foretrukket varighet', value: `${activeDuration} minutter` },
    { label: 'Daglig påminnelse', value: user.notifications === false ? 'Av' : reminder },
    { label: 'Standardlyd', value: 'Stillhet' },
    { label: 'Vis timer', value: 'På' },
  ];

  return (
    <Screen scroll edges={['top']} contentStyle={{ paddingTop: 8, paddingBottom: 40 }}>
      <View style={{ marginBottom: 32 }}>
        <Text style={[type.eyebrow, { marginBottom: 6 }]}>Profil</Text>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.member}>Medlem siden {MOCK_STATS.memberSince}</Text>
      </View>

      <View style={{ marginBottom: 32 }}>
        <Text style={[type.eyebrow, { marginBottom: 4 }]}>Innstillinger</Text>
        {settings.map((s) => (
          <Pressable key={s.label} style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
            <Text style={styles.rowLabel}>{s.label}</Text>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>{s.value}</Text>
              <Icon name="chevronRight" size={14} color={palette.mono400} />
            </View>
          </Pressable>
        ))}
      </View>

      <View>
        <Text style={[type.eyebrow, { marginBottom: 14 }]}>Om bored.</Text>
        <View style={styles.quote}>
          <Text style={styles.quoteText}>“Kjedsomhet er drømmefuglen som ruger ut erfaringens egg.”</Text>
          <Text style={styles.quoteAuthor}>— Walter Benjamin</Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { fontFamily: fonts.sansMedium, fontSize: 28, letterSpacing: em(28, -0.02), color: colors.fg },
  member: { fontFamily: fonts.sansLight, fontSize: 13, color: colors.fgTertiary, marginTop: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  rowLabel: { fontFamily: fonts.sans, fontSize: 15, color: colors.fg },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowValue: { fontFamily: fonts.sansLight, fontSize: 14, color: colors.fgTertiary },
  quote: { borderLeftWidth: 2, borderLeftColor: palette.mono300, paddingLeft: 16 },
  quoteText: { fontFamily: fonts.sansLightItalic, fontSize: 14, lineHeight: 24, color: colors.fgSecondary },
  quoteAuthor: { fontFamily: fonts.sansLight, fontSize: 12, color: palette.mono500, marginTop: 8 },
});
