import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AI_UNLOCK_SESSIONS, MOCK_AI_SUGGESTION_MIN } from '@/data/mock';
import { colors, em, fonts, onDark, palette, screenPadding } from '@/theme';

type Props = {
  visible: boolean;
  current: number;
  sessionCount: number;
  onSelect: (minutes: number) => void;
  onClose: () => void;
};

const PRESETS = [5, 10, 15, 20];

/** Bottom sheet for picking session length (presets, custom, locked AI suggestion). */
export function DurationSheet({ visible, current, sessionCount, onSelect, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [showCustom, setShowCustom] = useState(false);
  const [custom, setCustom] = useState('');
  const aiUnlocked = sessionCount >= AI_UNLOCK_SESSIONS;

  const close = () => {
    setShowCustom(false);
    setCustom('');
    onClose();
  };
  const select = (m: number) => {
    setShowCustom(false);
    setCustom('');
    onSelect(m);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close}>
          <View style={styles.backdrop} />
        </Pressable>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>
          <View style={{ paddingHorizontal: screenPadding, paddingTop: 8 }}>
            <Text style={styles.title}>Velg varighet</Text>
            <Text style={styles.sub}>Hvor lang tid har du i dag?</Text>

            <View style={styles.grid}>
              {PRESETS.map((p) => {
                const active = current === p;
                return (
                  <Pressable
                    key={p}
                    onPress={() => select(p)}
                    style={[styles.preset, active && styles.presetActive]}
                  >
                    <Text style={[styles.presetText, active && { color: onDark.fg }]}>
                      {p} <Text style={styles.presetUnit}>min</Text>
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {!showCustom ? (
              <Pressable onPress={() => setShowCustom(true)} style={styles.customBtn}>
                <Text style={styles.customText}>+ Egendefinert tid</Text>
              </Pressable>
            ) : (
              <View style={styles.customRow}>
                <TextInput
                  autoFocus
                  keyboardType="number-pad"
                  placeholder="Antall minutter"
                  placeholderTextColor={colors.fgPlaceholder}
                  value={custom}
                  onChangeText={(t) => setCustom(t.replace(/[^0-9]/g, '').slice(0, 3))}
                  style={styles.customInput}
                />
                <Text style={{ fontSize: 13, color: colors.fgTertiary, fontFamily: fonts.sans }}>min</Text>
                <Pressable
                  onPress={() => {
                    const n = parseInt(custom, 10);
                    if (n > 0 && n <= 120) select(n);
                  }}
                  style={styles.okBtn}
                >
                  <Text style={styles.okText}>OK</Text>
                </Pressable>
              </View>
            )}

            {/* TODO: AI suggestion is mocked; no model call */}
            <View style={[styles.ai, aiUnlocked ? { backgroundColor: colors.fg } : { opacity: 0.7 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.aiTitle, aiUnlocked && { color: onDark.fg }]}>
                  AI-forslag{!aiUnlocked && ' — låst'}
                </Text>
                <Text style={[styles.aiSub, aiUnlocked && { color: 'rgba(248,246,242,0.5)' }]}>
                  {aiUnlocked
                    ? `Basert på ${AI_UNLOCK_SESSIONS}+ sesjoner: ${MOCK_AI_SUGGESTION_MIN} min passer deg nå.`
                    : `Tilgjengelig etter ${AI_UNLOCK_SESSIONS} sesjoner. ${Math.max(0, AI_UNLOCK_SESSIONS - sessionCount)} gjenstår.`}
                </Text>
              </View>
              {aiUnlocked && (
                <Pressable onPress={() => select(MOCK_AI_SUGGESTION_MIN)} style={styles.aiBtn}>
                  <Text style={styles.okText}>Bruk</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: colors.bgOverlay },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: -4 },
  },
  handleRow: { alignItems: 'center', paddingTop: 12, paddingBottom: 8 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: palette.mono400 },
  title: { fontFamily: fonts.sansMedium, fontSize: 18, letterSpacing: em(18, -0.02), color: colors.fg, marginBottom: 6 },
  sub: { fontFamily: fonts.sansLight, fontSize: 13, color: colors.fgTertiary, marginBottom: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  preset: {
    width: '48.5%',
    flexGrow: 1,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(17,17,16,0.16)',
  },
  presetActive: { backgroundColor: colors.fg, borderColor: colors.fg },
  presetText: { fontFamily: fonts.sansMedium, fontSize: 17, letterSpacing: em(17, -0.02), color: colors.fg },
  presetUnit: { fontFamily: fonts.sansLight, fontSize: 13, opacity: 0.6 },
  customBtn: {
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    marginBottom: 12,
  },
  customText: { fontFamily: fonts.sans, fontSize: 14, color: colors.fgTertiary },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.fg,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  customInput: { flex: 1, fontFamily: fonts.sansLight, fontSize: 18, color: colors.fg, paddingVertical: 2 },
  okBtn: { backgroundColor: colors.fg, paddingVertical: 8, paddingHorizontal: 16 },
  okText: { fontFamily: fonts.sansMedium, fontSize: 13, color: onDark.fg },
  ai: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: palette.mono200 },
  aiTitle: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.fgTertiary, marginBottom: 2 },
  aiSub: { fontFamily: fonts.sansLight, fontSize: 11, lineHeight: 16, color: palette.mono500 },
  aiBtn: { backgroundColor: 'rgba(255,255,255,0.15)', paddingVertical: 8, paddingHorizontal: 14 },
});
