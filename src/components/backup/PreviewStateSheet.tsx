import { type RefObject } from 'react';
import { Pressable, StyleSheet, Text, View, type HostInstance } from 'react-native';

import { PREVIEW_MENU_TITLE } from '@/backup/copy';
import type { PreviewForce } from '@/backup/model';
import { ContentColumn } from '@/components/ContentColumn';
import { Sheet } from '@/components/Sheet';
import { useRegisterSheetTitle } from '@/sheet/title';
import { useTheme } from '@/theme';

const OPTIONS: { id: PreviewForce | null; label: string }[] = [
  { id: null, label: 'Vanlig tilstand' },
  { id: 'restored', label: 'Hentet' },
  { id: 'accountSwitch', label: 'Bytte Apple-konto?' },
  { id: 'alreadyExists', label: 'Du har allerede en sikkerhetskopi' },
  { id: 'signedOut', label: 'Logg på igjen' },
  { id: 'stale', label: 'Ikke oppdatert' },
  { id: 'keyMissing', label: 'Kan ikke leses' },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  onPick: (screen: PreviewForce | null) => void;
  /** Focus returns to the control that opened the sheet. */
  returnFocusRef?: RefObject<HostInstance | null>;
};

/** Hidden preview menu. Five taps on the version number, and only while BACKUP_MODE is preview. */
export function PreviewStateSheet({ visible, onClose, onPick, returnFocusRef }: Props) {
  const { theme } = useTheme();
  const titleRef = useRegisterSheetTitle();

  return (
    <Sheet visible={visible} onClose={onClose} returnFocusRef={returnFocusRef}>
      <ContentColumn style={[styles.body, { gap: theme.space['2'] }]}>
        <Text
          ref={titleRef}
          accessibilityRole="header"
          style={[theme.text.headline, { color: theme.color.text.primary }]}
        >
          {PREVIEW_MENU_TITLE}
        </Text>
        {OPTIONS.map((option) => (
          <Pressable
            key={option.label}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            onPress={() => onPick(option.id)}
            style={[styles.row, { borderBottomColor: theme.color.border.default }]}
          >
            <Text style={[theme.text.label, { color: theme.color.text.primary }]}>{option.label}</Text>
          </Pressable>
        ))}
      </ContentColumn>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingTop: 4 },
  row: { minHeight: 44, justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
});
