import { useState } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatSessionDate, MOOD_COLORS, type SessionEntry } from '@/data/mock';
import { colors, em, fonts, palette, type } from '@/theme';
import { Icon } from './Icon';

type Props = { sessions: SessionEntry[]; onViewAll?: () => void; limit?: number };

/** Collapsible list of recent sessions with their reflection notes (the journal). */
export function RecentSessions({ sessions, onViewAll, limit }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const list = limit ? sessions.slice(0, limit) : sessions;

  const toggle = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((e) => (e === id ? null : id));
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={type.eyebrow}>Siste økter</Text>
        {onViewAll && (
          <Pressable onPress={onViewAll} hitSlop={8}>
            <Text style={styles.viewAll}>Se alle</Text>
          </Pressable>
        )}
      </View>
      {list.map((s) => {
        const open = expanded === s.id;
        const moodColor = s.mood ? MOOD_COLORS[s.mood] : palette.mono400;
        return (
          <View key={s.id}>
            <Pressable onPress={() => toggle(s.id)} style={[styles.row, !open && styles.rowBorder]}>
              <View style={styles.left}>
                <View style={[styles.dot, { backgroundColor: moodColor }]} />
                <View>
                  <Text style={styles.dur}>{s.minutes} minutter</Text>
                  <Text style={styles.date}>{formatSessionDate(s.date)}</Text>
                </View>
              </View>
              <View style={styles.right}>
                {s.note ? (
                  <Text style={styles.notePreview} numberOfLines={2}>
                    “{s.note.length > 40 ? `${s.note.slice(0, 40)}…` : s.note}”
                  </Text>
                ) : null}
                <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
                  <Icon name="chevronDown" size={14} color={palette.mono400} />
                </View>
              </View>
            </Pressable>
            {open && (
              <View style={[styles.expanded, styles.rowBorder]}>
                <Text style={styles.moodLine}>
                  Stemning:{' '}
                  <Text style={{ color: s.mood ? moodColor : colors.fg, fontFamily: fonts.sansMedium }}>
                    {s.mood ?? 'ikke valgt'}
                  </Text>
                </Text>
                {s.note ? (
                  <Text style={styles.note}>“{s.note}”</Text>
                ) : (
                  <Text style={styles.noNote}>Ingen refleksjon notert.</Text>
                )}
                {/* TODO: session detail screen */}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderTopWidth: 1, borderTopColor: 'rgba(17,17,16,0.08)', paddingTop: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  viewAll: { fontFamily: fonts.sans, fontSize: 12, color: colors.fgTertiary },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, marginLeft: 12 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  dur: { fontFamily: fonts.sansMedium, fontSize: 15, letterSpacing: em(15, -0.01), color: colors.fg },
  date: { fontFamily: fonts.sansLight, fontSize: 11, color: colors.fgTertiary, marginTop: 1 },
  notePreview: {
    fontFamily: fonts.sansLightItalic,
    fontSize: 11,
    lineHeight: 15,
    color: palette.mono500,
    maxWidth: 120,
    textAlign: 'right',
  },
  expanded: {
    paddingTop: 12,
    paddingBottom: 16,
    paddingLeft: 17,
    marginLeft: 3,
    borderLeftWidth: 2,
    borderLeftColor: palette.mono300,
  },
  moodLine: { fontFamily: fonts.sans, fontSize: 12, color: colors.fgTertiary, marginBottom: 6 },
  note: { fontFamily: fonts.sansLightItalic, fontSize: 13, lineHeight: 21, color: colors.fgSecondary },
  noNote: { fontFamily: fonts.sansLight, fontSize: 12, color: palette.mono500 },
});
