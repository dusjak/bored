import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { MOOD_COLORS, MOODS, type Mood } from '@/data/mock';
import { useAppState } from '@/state/AppState';
import { colors, fonts, palette, type } from '@/theme';

/** Post-session reflection: mood + free-text journal entry. */
export default function Reflection() {
  const params = useLocalSearchParams<{ minutes?: string }>();
  const minutes = Math.max(1, parseInt(params.minutes ?? '10', 10) || 10);
  const { addSession } = useAppState();
  const [mood, setMood] = useState<Mood | null>(null);
  const [text, setText] = useState('');

  const done = (save: boolean) => {
    // TODO: store in persistent journal; AI insights would be generated from these entries later
    addSession({ minutes, mood: save ? mood : null, note: save ? text.trim() : '' });
    if (save) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.dismissTo('/home');
  };

  return (
    <Screen scroll contentStyle={{ paddingTop: 24, paddingBottom: 40 }}>
      <View style={{ marginBottom: 40 }}>
        <Text style={[type.eyebrow, { marginBottom: 10 }]}>Økt fullført</Text>
        <Text style={[type.display(44, 1.05), { marginBottom: 8 }]}>{`${minutes} minutter\nmed ingenting.`}</Text>
        <Text style={type.caption}>Du klarte det.</Text>
      </View>

      <View style={{ marginBottom: 32 }}>
        <Text style={styles.label}>Hvordan kjentes det?</Text>
        <View style={styles.moods}>
          {MOODS.map((m) => {
            const active = mood === m;
            return (
              <Pressable
                key={m}
                onPress={() => {
                  Haptics.selectionAsync();
                  setMood(active ? null : m);
                }}
                style={[
                  styles.pill,
                  active
                    ? { backgroundColor: MOOD_COLORS[m], borderColor: MOOD_COLORS[m] }
                    : { borderColor: 'rgba(17,17,16,0.18)' },
                ]}
              >
                <Text style={[styles.pillText, { color: active ? colors.fgInverse : colors.fgSecondary }]}>{m}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ marginBottom: 40 }}>
        <Text style={[styles.label, { marginBottom: 10 }]}>Hva dukket opp?</Text>
        <TextInput
          multiline
          placeholder="Hva som helst — en tanke, en idé, ingenting spesielt."
          placeholderTextColor={colors.fgPlaceholder}
          value={text}
          onChangeText={setText}
          style={styles.input}
        />
        <Text style={styles.hint}>Valgfritt. Privat. Deles aldri.</Text>
      </View>

      <Button title="Lagre og avslutt" onPress={() => done(true)} style={{ marginBottom: 8 }} />
      <Button title="Hopp over" variant="ghost" onPress={() => done(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.fg, marginBottom: 14 },
  moods: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderRadius: 999 },
  pillText: { fontFamily: fonts.sans, fontSize: 13 },
  input: {
    fontFamily: fonts.sansLight,
    fontSize: 16,
    lineHeight: 26,
    color: colors.fg,
    minHeight: 110,
    paddingTop: 12,
    paddingBottom: 10,
    textAlignVertical: 'top',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,17,16,0.18)',
  },
  hint: { fontFamily: fonts.sansLight, fontSize: 11, color: palette.mono500, marginTop: 6 },
});
