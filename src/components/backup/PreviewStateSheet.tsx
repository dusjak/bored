import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PREVIEW_MENU_TITLE } from '@/backup/copy';
import type { PreviewForce } from '@/backup/model';
import { ContentColumn } from '@/components/ContentColumn';
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
};

/** Hidden preview menu. Five taps on the version number, and only while BACKUP_MODE is preview. */
export function PreviewStateSheet({ visible, onClose, onPick }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.wrap}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Lukk" accessibilityRole="button">
          <View style={[styles.backdrop, { backgroundColor: theme.color.bg.overlay }]} />
        </Pressable>
        <View
          accessibilityViewIsModal
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
          <ContentColumn style={[styles.body, { gap: theme.space['2'] }]}>
            <Text accessibilityRole="header" style={[theme.text.headline, { color: theme.color.text.primary }]}>
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
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1 },
  sheet: { paddingTop: 12 },
  body: { paddingTop: 12 },
  row: { minHeight: 44, justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
});
