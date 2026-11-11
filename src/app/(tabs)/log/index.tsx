import { useRef, useState } from 'react';
import { AccessibilityInfo, findNodeHandle, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { shouldShowBackupNudge } from '@/backup/nudge';
import { BackupNudgeCard } from '@/components/backup/BackupNudgeCard';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Icon } from '@/components/Icon';
import { SessionKlumps } from '@/components/SessionKlumps';
import { abortedPhrase, chosenMinutes, formatSessionDate, minutesPhrase } from '@/data/copy';
import {
  LOG_DELETE_FLEX,
  LOG_KLUMP_SPACING,
  LOG_NOTE_ACTION_GAP,
  LOG_SAVE_FLEX,
  LOGG_COLLAPSED_MAX,
  LOGG_TOGGLE,
  logCaption,
} from '@/data/klumper';
import { sessionTotals } from '@/data/sessionQueries';
import { MOODS, type MoodId, type SessionWithJournal } from '@/data/types';
import { useAppState } from '@/state/AppState';
import { useBackup } from '@/state/BackupState';
import { useTheme } from '@/theme';

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
  const [tallyOpen, setTallyOpen] = useState(false);
  const showToggle = total > LOGG_COLLAPSED_MAX;
  const caption = logCaption(total, completed, aborted);
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
        {total === 0 ? (
          <View ref={countRef} collapsable={false}>
            <Text style={[theme.text.body, { color: theme.color.text.secondary }]}>Ingen økter ennå.</Text>
          </View>
        ) : (
          <>
            <SessionKlumps sessions={sessions} expanded={tallyOpen} />
            {showToggle ? (
              <Pressable
                onPress={() => setTallyOpen((open) => !open)}
                accessibilityRole="button"
                accessibilityState={{ expanded: tallyOpen }}
                accessibilityLabel={tallyOpen ? LOGG_TOGGLE.less : LOGG_TOGGLE.more}
                style={[styles.toggle, { marginTop: LOG_KLUMP_SPACING.aboveToggle }]}
              >
                <Text style={[theme.text.monoData, { color: theme.color.text.primary }]}>
                  {tallyOpen ? LOGG_TOGGLE.less : LOGG_TOGGLE.more}
                </Text>
                <View style={tallyOpen ? styles.chevronUp : undefined}>
                  <Icon name="chevronDown" size={16} color={theme.color.text.primary} />
                </View>
              </Pressable>
            ) : null}
            <View
              ref={countRef}
              collapsable={false}
              accessible
              accessibilityRole="text"
              accessibilityLabel={caption}
              style={{ marginTop: showToggle ? LOG_KLUMP_SPACING.belowToggle : LOG_KLUMP_SPACING.aboveSummary }}
            >
              <Text style={[theme.text.caption, { color: theme.color.text.secondary }]}>{caption}</Text>
            </View>
          </>
        )}
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
              <View style={styles.rowHit}>
                <Pressable
                  onPress={() => open(session)}
                  accessibilityRole="button"
                  accessibilityLabel={isAborted ? `${title}. ${when}` : `${title}. ${when}`}
                  style={{ flex: 1 }}
                >
                  <Text
                    style={[
                      theme.text.monoData,
                      { color: isAborted ? theme.color.text.secondary : theme.color.text.primary },
                    ]}
                  >
                    {title}
                  </Text>
                  <Text style={[theme.text.monoMeta, { color: theme.color.text.tertiary, marginTop: 2 }]}>{when}</Text>
                </Pressable>
                {expanded ? (
                  <View style={styles.actionsRow}>
                    <Button
                      title="Lagre"
                      size="compact"
                      hug
                      style={{ height: 32 }}
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
                        hug
                        textStyle={{ color: theme.color.text.destructive }}
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
                ) : session.journal?.note ? (
                  <Text
                    numberOfLines={2}
                    style={[theme.text.note, styles.preview, { color: theme.color.text.secondary }]}
                  >
                    «{session.journal.note}»
                  </Text>
                ) : null}
              </View>
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
                    style={[theme.text.body, styles.input, { color: theme.color.text.primary }]}
                  />
                  {error ? (
                    <Text style={[theme.text.caption, { color: theme.color.text.secondary, marginTop: theme.space['2'] }]}>
                      {error}
                    </Text>
                  ) : null}
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
  // The tally sits where the count used to, under the screen's 40pt top inset.
  content: { paddingBottom: 140 },
  toggle: {
    minHeight: LOGG_TOGGLE.minHeight,
    minWidth: 100,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chevronUp: { transform: [{ rotate: '180deg' }] },
  row: { borderBottomWidth: 1 },
  rowHit: { minHeight: 44, flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  preview: { maxWidth: 140, textAlign: 'right' },
  input: { minHeight: 88, paddingTop: 8, textAlignVertical: 'top' },
  actions: { marginTop: 16 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: LOG_NOTE_ACTION_GAP },
  saveSlot: { flex: LOG_SAVE_FLEX },
  deleteSlot: { flex: LOG_DELETE_FLEX },
});
