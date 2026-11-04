import { useRef, useState } from 'react';
import { AccessibilityInfo, findNodeHandle, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { shouldShowBackupNudge } from '@/backup/nudge';
import { BackupNudgeCard } from '@/components/backup/BackupNudgeCard';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TallyMarks } from '@/components/TallyMarks';
import { abortedPhrase, chosenMinutes, formatSessionDate, minutesPhrase, sessionsPhrase } from '@/data/copy';
import { sessionTotals } from '@/data/sessionQueries';
import { MOODS, type MoodId, type SessionWithJournal } from '@/data/types';
import { useAppState } from '@/state/AppState';
import { useBackup } from '@/state/BackupState';
import { monoHeroFontLineHeight, useTheme } from '@/theme';

function moodLabel(id: MoodId | null): string | null {
  if (!id) return null;
  return MOODS.find((mood) => mood.id === id)?.label ?? null;
}

export default function Log() {
  const { theme } = useTheme();
  const { sessions, saveReflection, removeReflection } = useAppState();
  const backup = useBackup();
  const countRef = useRef<React.ComponentRef<typeof View>>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { total, completed, aborted } = sessionTotals(sessions);
  const showNudge =
    backup.ready && backup.mode !== 'off' && shouldShowBackupNudge(backup.nudge, completed);

  const focusCount = () => {
    requestAnimationFrame(() => {
      const node = findNodeHandle(countRef.current);
      if (node != null) AccessibilityInfo.setAccessibilityFocus(node);
    });
  };

  const open = (session: SessionWithJournal) => {
    setOpenId((current) => (current === session.id ? null : session.id));
    setDraft(session.journal?.note ?? '');
    setError(null);
  };

  return (
    <Screen scroll edges={['top']} top="app" contentStyle={styles.content}>
      {showNudge ? (
        <BackupNudgeCard
          onEnable={() => router.push('/log/backup')}
          onDismiss={() => {
            void backup.dismissNudge(completed).then(focusCount);
          }}
        />
      ) : null}

      <View style={{ marginBottom: theme.space['8'] }}>
        <View
          ref={countRef}
          collapsable={false}
          style={styles.countRow}
          accessible
          accessibilityLabel={sessionsPhrase(total)}
        >
          <Text style={[theme.text.monoHero, styles.count, { color: theme.color.text.primary }]}>{total}</Text>
          <Text style={[theme.text.bodyLarge, { color: theme.color.text.primary, marginLeft: theme.space['3'] }]}>
            {total === 1 ? 'økt' : 'økter'}
          </Text>
        </View>
        {total > 0 ? <TallyMarks sessions={sessions} /> : null}
        {total === 0 ? (
          <Text style={[theme.text.body, { color: theme.color.text.secondary, marginTop: theme.space['3'] }]}>
            Ingen økter ennå.
          </Text>
        ) : null}
        {aborted > 0 ? (
          <Text style={[theme.text.caption, { color: theme.color.text.secondary, marginTop: theme.space['2'] }]}>
            <Text style={theme.text.monoData}>{completed}</Text>
            {' fullført, '}
            <Text style={theme.text.monoData}>{aborted}</Text>
            {' avbrutt'}
          </Text>
        ) : null}
      </View>

      <View>
        {sessions.map((session) => {
          const isAborted = session.status === 'aborted';
          const expanded = openId === session.id;
          const when = formatSessionDate(new Date(session.startedAt));
          const title = isAborted
            ? abortedPhrase(session.actualDurationSeconds)
            : minutesPhrase(chosenMinutes(session.chosenDurationSeconds));
          const mood = moodLabel(session.journal?.mood ?? null);
          return (
            <View key={session.id} style={[styles.row, { borderBottomColor: theme.color.border.default }]}>
              <Pressable
                onPress={() => open(session)}
                accessibilityRole="button"
                accessibilityLabel={isAborted ? `${title}. ${when}` : `${title}. ${when}`}
                style={styles.rowHit}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      theme.text.label,
                      { color: isAborted ? theme.color.text.secondary : theme.color.text.primary },
                    ]}
                  >
                    {title}
                  </Text>
                  <Text style={[theme.text.caption, { color: theme.color.text.tertiary, marginTop: 2 }]}>{when}</Text>
                </View>
                {session.journal?.note ? (
                  <Text
                    numberOfLines={2}
                    style={[theme.text.note, styles.preview, { color: theme.color.text.secondary }]}
                  >
                    «{session.journal.note}»
                  </Text>
                ) : null}
              </Pressable>
              {expanded ? (
                <View style={{ paddingBottom: theme.space['4'] }}>
                  {mood ? (
                    <Text style={[theme.text.caption, { color: theme.color.text.secondary, marginBottom: theme.space['3'] }]}>
                      {mood}
                    </Text>
                  ) : null}
                  <TextInput
                    multiline
                    value={draft}
                    onChangeText={setDraft}
                    placeholder="Hva som helst. En tanke, en idé, ingenting spesielt."
                    placeholderTextColor={theme.color.text.tertiary}
                    accessibilityLabel="Notat"
                    style={[
                      theme.text.body,
                      styles.input,
                      { color: theme.color.text.primary, borderBottomColor: theme.color.border.strong },
                    ]}
                  />
                  {error ? (
                    <Text style={[theme.text.caption, { color: theme.color.text.secondary, marginTop: theme.space['2'] }]}>
                      {error}
                    </Text>
                  ) : null}
                  <View style={styles.actions}>
                    <Button
                      title="Lagre"
                      size="compact"
                      onPress={() => {
                        saveReflection(session.id, session.journal?.mood ?? null, draft.trim())
                          .then(() => setError(null))
                          .catch(() => setError('fikk ikke lagret. prøv igjen.'));
                      }}
                    />
                    {session.journal ? (
                      <Button
                        title="Slett"
                        variant="ghost"
                        size="compact"
                        onPress={() => {
                          removeReflection(session.id)
                            .then(() => {
                              setDraft('');
                              setError(null);
                            })
                            .catch(() => setError('fikk ikke lagret. prøv igjen.'));
                        }}
                      />
                    ) : null}
                  </View>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 140 },
  countRow: { flexDirection: 'row', alignItems: 'baseline' },
  // Taller than monoHero's 56 so iOS does not clip the top of the digit.
  count: { lineHeight: monoHeroFontLineHeight },
  row: { borderBottomWidth: 1 },
  rowHit: { minHeight: 44, flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  preview: { maxWidth: 140, textAlign: 'right' },
  input: { minHeight: 88, paddingTop: 8, borderBottomWidth: 1, textAlignVertical: 'top' },
  actions: { marginTop: 16, gap: 4 },
});
