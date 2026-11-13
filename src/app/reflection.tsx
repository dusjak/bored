import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { knappetrykk } from '@/analytics/track';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { ScreenTitle } from '@/components/ScreenTitle';
import { abortedPhrase } from '@/data/copy';
import { getSession } from '@/data/repository';
import { MOODS, type MoodId, type SessionWithJournal } from '@/data/types';
import { useAppState } from '@/state/AppState';
import { space, useTheme } from '@/theme';

/** Optional note after a session. The session itself is already stored. */
export default function Reflection() {
  const { theme } = useTheme();
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const sessionId = typeof params.sessionId === 'string' ? params.sessionId : '';
  const { sessions, saveReflection } = useAppState();
  const listed = sessions.find((item) => item.id === sessionId) ?? null;
  const [fetched, setFetched] = useState<SessionWithJournal | null>(null);
  const session = listed ?? fetched;
  const [mood, setMood] = useState<MoodId | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!sessionId || listed) return;
    let cancelled = false;
    getSession(sessionId)
      .then((row) => {
        if (!cancelled) setFetched(row);
      })
      .catch(() => {
        if (!cancelled) setError('noe gikk galt. prøv igjen.');
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, listed]);

  const aborted = session?.status === 'aborted';
  const heading = !session
    ? ''
    : aborted
      ? abortedPhrase(session.actualDurationSeconds)
      : 'Det var det.';

  const leave = () => {
    knappetrykk({ type: 'Knapp', navn: 'Hopp over', hendelse: 'trykk', skjerm: 'notat', notat: false });
    router.replace('/home');
  };

  const save = async () => {
    if (!sessionId || saving) return;
    knappetrykk({
      type: 'Knapp',
      navn: 'Lagre',
      hendelse: 'submit',
      skjerm: 'notat',
      notat: note.trim().length > 0,
      ...(mood ? { stemning: mood } : {}),
    });
    setSaving(true);
    setError(null);
    try {
      await saveReflection(sessionId, mood, note.trim());
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      leave();
    } catch {
      setError('fikk ikke lagret. prøv igjen.');
      setSaving(false);
    }
  };

  return (
    <Screen top="app" contentStyle={styles.content}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.form}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ marginBottom: theme.space['8'] }}>
          <ScreenTitle>{heading}</ScreenTitle>
        </View>

        <Text style={[theme.text.label, { color: theme.color.text.primary, marginBottom: theme.space['3'] }]}>
          Hvordan føltes det?
        </Text>
        <View style={styles.moods}>
          {MOODS.map((item) => {
            const selected = mood === item.id;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={item.label}
                onPress={() => {
                  Haptics.selectionAsync();
                  setMood(selected ? null : item.id);
                }}
                style={[
                  styles.pill,
                  {
                    minHeight: theme.size['hit-min'],
                    borderRadius: theme.radius.pill,
                    backgroundColor: selected ? theme.color.button['primary-bg'] : theme.color.button['tertiary-bg'],
                  },
                ]}
              >
                <Text
                  style={[
                    theme.text.labelSmall,
                    { color: selected ? theme.color.button['primary-text'] : theme.color.button['tertiary-text'] },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[theme.text.label, { color: theme.color.text.primary, marginTop: theme.space['8'], marginBottom: theme.space['2'] }]}>
          Hva dukket opp?
        </Text>
        <TextInput
          multiline
          value={note}
          onChangeText={setNote}
          placeholder="Hva som helst. En tanke, en idé, ingenting spesielt."
          placeholderTextColor={theme.color.text.tertiary}
          accessibilityLabel="Notat"
          style={[
            theme.text.body,
            styles.input,
            { color: theme.color.text.primary, borderBottomColor: theme.color.border.strong },
          ]}
        />
        <Text style={[theme.text.caption, { color: theme.color.text.tertiary, marginTop: theme.space['2'] }]}>
          Valgfritt. Privat. Deles aldri.
        </Text>
      </ScrollView>

      {error ? (
        <Text style={[theme.text.caption, { color: theme.color.text.secondary, marginBottom: theme.space['3'] }]}>{error}</Text>
      ) : null}
      <Button title="Lagre" disabled={saving || !sessionId} onPress={save} />
      <Button title="Hopp over" variant="ghost" onPress={leave} style={{ marginTop: theme.space['2'] }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  scroll: { flex: 1 },
  form: { paddingBottom: space['6'] },
  moods: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  input: { minHeight: 110, paddingTop: 12, textAlignVertical: 'top', borderBottomWidth: 1 },
});
