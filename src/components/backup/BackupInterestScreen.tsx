import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { track } from '@/analytics/track';
import { PRIVACY, PRIVACY_LINK_GAP } from '@/backup/copy';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { ScreenTitle } from '@/components/ScreenTitle';
import { getSetting, setSetting } from '@/data/repository';
import { useTheme } from '@/theme';

const NOTED_KEY = 'backup.interestNoted';
/** Placeholder until design replaces the confirmation line. */
const THANKS = 'Takk, notert';

const BODY =
  'I dag ligger alt bare på denne telefonen. Ingenting lagres andre steder. Vi vurderer en kryptert sikkerhetskopi, men vet ikke om behovet er der.';

/** Variant A, «Rett fram». Deg pushes this. The tab bar stays the native one. */
export function BackupInterestScreen() {
  const { theme } = useTheme();
  const [noted, setNoted] = useState(false);

  useEffect(() => {
    track('backup_screen_viewed');
    let live = true;
    void getSetting(NOTED_KEY).then((value) => {
      if (live && value === '1') setNoted(true);
    });
    return () => {
      live = false;
    };
  }, []);

  const interest = () => {
    if (noted) return;
    setNoted(true);
    void setSetting(NOTED_KEY, '1');
    track('backup_interest_tapped');
  };

  return (
    <Screen edges={['top']} contentStyle={styles.content}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Deg"
        onPress={() => router.back()}
        style={[styles.back, { gap: theme.space['1'] }]}
      >
        <Icon name="chevronLeft" size={22} color={theme.color.text.primary} />
        <Text style={[theme.text.body, { color: theme.color.text.primary }]}>Deg</Text>
      </Pressable>
      <ScreenTitle style={{ marginTop: 16, marginBottom: 8 }}>Sikkerhetskopi</ScreenTitle>
      <Text style={[theme.text.body, { color: theme.color.text.secondary }]}>{BODY}</Text>
      <View style={styles.spacer} />
      <Button title={noted ? THANKS : 'Jeg vil ha det'} disabled={noted} onPress={interest} />
      <View
        accessibilityRole="text"
        accessibilityLabel={PRIVACY}
        style={[styles.privacy, { gap: theme.space['2'], marginTop: PRIVACY_LINK_GAP }]}
      >
        <Text style={[theme.text.bodySmall, { color: theme.color.text.secondary }]}>{PRIVACY}</Text>
        <Icon name="chevronRight" size={16} color={theme.color.text.tertiary} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 120 },
  back: { flexDirection: 'row', alignItems: 'center', minHeight: 44, alignSelf: 'flex-start' },
  spacer: { flex: 1 },
  privacy: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
});
