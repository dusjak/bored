import { useEffect, useRef, useState } from 'react';
import { Modal, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
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
 * Same presentation as Utseende on this screen: a transparent modal that fades,
 * a dimmed backdrop, a grabber, and drag-to-dismiss on the grabber only.
 * The wheel keeps its own one-finger pans, so the sheet gesture stays off the columns.
 * Nothing is saved until the check.
 */
export function ReminderTimeSheet({ visible, hour, minute, onCancel, onConfirm }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState({ hour, minute });

  useEffect(() => {
    if (visible) setDraft({ hour, minute });
  }, [hour, minute, visible]);

  const cancelRef = useRef(onCancel);
  cancelRef.current = onCancel;
  const drag = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) => gesture.dy > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderRelease: (_event, gesture) => {
        if (gesture.dy > 32) cancelRef.current();
      },
    }),
  ).current;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.wrap}>
        <Pressable
          accessibilityLabel="Lukk"
          accessibilityRole="button"
          onPress={onCancel}
          style={StyleSheet.absoluteFill}
        >
          <View style={[styles.backdrop, { backgroundColor: theme.color.bg.overlay }]} />
        </Pressable>
        <View
          accessibilityActions={[{ name: 'close', label: 'Lukk' }]}
          accessibilityViewIsModal
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === 'close') onCancel();
          }}
          style={[
            styles.sheet,
            {
              backgroundColor: theme.color.surface.sheet,
              paddingBottom: Math.max(insets.bottom, theme.space['6']),
              borderTopLeftRadius: theme.radius.large,
              borderTopRightRadius: theme.radius.large,
            },
          ]}
        >
          <Pressable
            accessibilityLabel="Lukk"
            accessibilityRole="button"
            onPress={onCancel}
            style={styles.handleHit}
            {...drag.panHandlers}
          >
            <View style={[styles.handle, { backgroundColor: theme.color.control.off }]} />
          </Pressable>
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
              style={[styles.round, { backgroundColor: theme.color.button['primary-bg'] }]}
            >
              <SymbolView name="checkmark" size={16} tintColor={theme.color.button['primary-text']} weight="bold" />
            </Pressable>
          </View>
          <TimeWheel
            hour={draft.hour}
            minute={draft.minute}
            open={visible}
            onChange={(nextHour, nextMinute) => setDraft({ hour: nextHour, minute: nextMinute })}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1 },
  sheet: {},
  handleHit: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  handle: { width: 36, height: 4, borderRadius: 2 },
  header: { minHeight: 44, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 17, lineHeight: 22 },
  round: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
