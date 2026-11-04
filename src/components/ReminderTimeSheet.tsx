import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TimeWheel } from '@/components/TimeWheel';
import { useTheme } from '@/theme';

type Props = {
  visible: boolean;
  hour: number;
  minute: number;
  onCancel: () => void;
  /** Persists the time and reschedules the reminder. */
  onConfirm: (hour: number, minute: number) => void;
};

/**
 * iOS Clock-style editor. The pill opens this sheet; nothing is saved until
 * the check. The wheel is not inside the Deg scroll view, so the columns can move.
 */
export function ReminderTimeSheet({ visible, hour, minute, onCancel, onConfirm }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState({ hour, minute });

  useEffect(() => {
    if (visible) setDraft({ hour, minute });
  }, [hour, minute, visible]);

  return (
    <Modal animationType="slide" onRequestClose={onCancel} transparent visible={visible}>
      <View style={styles.fill}>
        <Pressable accessibilityLabel="Lukk" accessibilityRole="button" onPress={onCancel} style={styles.fill}>
          <View style={[styles.backdrop, { backgroundColor: theme.color.bg.overlay }]} />
        </Pressable>
        <View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              backgroundColor: theme.color.surface.sheet,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <View style={styles.header}>
            <Pressable
              accessibilityLabel="Avbryt"
              accessibilityRole="button"
              onPress={onCancel}
              style={[styles.round, { backgroundColor: theme.color.control.capsule }]}
            >
              <SymbolView name="xmark" size={14} tintColor={theme.color.text.primary} weight="semibold" />
            </Pressable>
            <Text style={[theme.text.body, styles.title, { color: theme.color.text.primary }]}>Tidspunkt</Text>
            <Pressable
              accessibilityLabel="Bekreft tidspunkt"
              accessibilityRole="button"
              onPress={() => onConfirm(draft.hour, draft.minute)}
              style={[styles.round, { backgroundColor: theme.color.accent.default }]}
            >
              <SymbolView name="checkmark" size={16} tintColor={theme.color.text.primary} weight="bold" />
            </Pressable>
          </View>
          <TimeWheel
            hour={draft.hour}
            minute={draft.minute}
            open
            onChange={(nextHour, nextMinute) => setDraft({ hour: nextHour, minute: nextMinute })}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1 },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12 },
  header: { minHeight: 44, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 17, lineHeight: 22 },
  round: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
