import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { DurationSheet } from '@/components/DurationSheet';
import { Logo } from '@/components/Logo';
import { Screen } from '@/components/Screen';
import { HOME_ROUTINE } from '@/data/mock';
import { useAppState } from '@/state/AppState';
import { colors, fonts, type } from '@/theme';

export default function Home() {
  const { user, activeDuration, setActiveDuration, stats } = useAppState();
  const [pickerOpen, setPickerOpen] = useState(false);
  const routine = (user.time && HOME_ROUTINE[user.time]) || 'din rytme';

  return (
    <Screen edges={['top']}>
      <View style={styles.top}>
        <Logo />
        <View style={styles.streak}>
          <View style={styles.streakDot} />
          <Text style={styles.streakText}>{stats.streakDays} dager på rad</Text>
        </View>
      </View>

      <View style={styles.hero}>
        {/* TODO: "Dagens forslag" is the preferred duration; replace with personalised suggestion */}
        <Text style={[type.eyebrow, { marginBottom: 14 }]}>Dagens forslag</Text>
        <Text style={[type.display(80, 0.95), { marginBottom: 12 }]} adjustsFontSizeToFit numberOfLines={1}>
          {activeDuration} min
        </Text>
        <Text style={[type.caption, { marginBottom: 32 }]}>Basert på {routine}. Vanligvis rundt nå.</Text>
        <Button
          title="Start økt"
          style={{ marginBottom: 10, paddingVertical: 20 }}
          textStyle={{ fontSize: 17 }}
          onPress={() => router.push({ pathname: '/session', params: { minutes: String(activeDuration) } })}
        />
        <Button
          title="Velg en annen varighet"
          variant="ghost"
          textStyle={{ color: colors.fgSecondary }}
          onPress={() => setPickerOpen(true)}
        />
      </View>

      <DurationSheet
        visible={pickerOpen}
        current={activeDuration}
        sessionCount={stats.totalSessions}
        onSelect={(m) => {
          setActiveDuration(m);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  streakDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent },
  streakText: { fontFamily: fonts.sans, fontSize: 12, color: colors.fgTertiary },
  hero: { flex: 1, justifyContent: 'center', paddingBottom: 24 },
});
