import { useEffect, useState, type RefObject } from 'react';
import { Pressable, StyleSheet, Text, View, type HostInstance } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Sheet } from '@/components/Sheet';
import { TimeWheel } from '@/components/TimeWheel';
import { useRegisterSheetTitle } from '@/sheet/title';
import { sheetContentPullUp } from '@/sheet/motion';
import { useTheme } from '@/theme';

type Props = {
  visible: boolean;
  hour: number;
  minute: number;
  onCancel: () => void;
  /** Persists the time and reschedules the reminder. */
  onConfirm: (hour: number, minute: number) => void;
  /** Focus returns to the row that opened the sheet. */
  returnFocusRef?: RefObject<HostInstance | null>;
};

/**
 * The same sheet as Utseende: slide up and down, dimmed backdrop, grabber,
 * and drag-to-dismiss. `scrollable` stays off so that pan lives on the grabber
 * and each wheel keeps its own one-finger drag. Nothing is saved until the check.
 */
export function ReminderTimeSheet({ visible, hour, minute, onCancel, onConfirm, returnFocusRef }: Props) {
  const [draft, setDraft] = useState({ hour, minute });

  useEffect(() => {
    if (visible) setDraft({ hour, minute });
  }, [hour, minute, visible]);

  return (
    <Sheet visible={visible} onClose={onCancel} scrollable={false} returnFocusRef={returnFocusRef}>
      <TimeSheetBody
        hour={draft.hour}
        minute={draft.minute}
        onCancel={onCancel}
        onConfirm={() => onConfirm(draft.hour, draft.minute)}
        onChange={(nextHour, nextMinute) => setDraft({ hour: nextHour, minute: nextMinute })}
      />
    </Sheet>
  );
}

function TimeSheetBody({
  hour,
  minute,
  onCancel,
  onConfirm,
  onChange,
}: {
  hour: number;
  minute: number;
  onCancel: () => void;
  onConfirm: () => void;
  onChange: (hour: number, minute: number) => void;
}) {
  const { theme } = useTheme();
  const titleRef = useRegisterSheetTitle();

  return (
    <>
      <View style={[styles.header, { marginTop: sheetContentPullUp() }]}>
        <Pressable
          accessibilityLabel="Avbryt"
          accessibilityRole="button"
          onPress={onCancel}
          style={[styles.round, { backgroundColor: theme.color.control.capsule }]}
        >
          <SymbolView name="xmark" size={14} tintColor={theme.color.text.primary} weight="semibold" />
        </Pressable>
        <Text
          ref={titleRef}
          accessibilityRole="header"
          style={[theme.text.body, styles.title, { color: theme.color.text.primary }]}
        >
          Tidspunkt
        </Text>
        <Pressable
          accessibilityLabel="Bekreft tidspunkt"
          accessibilityRole="button"
          onPress={onConfirm}
          style={[styles.round, { backgroundColor: theme.color.button['primary-bg'] }]}
        >
          <SymbolView name="checkmark" size={16} tintColor={theme.color.button['primary-text']} weight="bold" />
        </Pressable>
      </View>
      <TimeWheel hour={hour} minute={minute} open onChange={onChange} />
    </>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 44, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 17, lineHeight: 22 },
  round: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
