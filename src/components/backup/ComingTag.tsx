import { StyleSheet, Text, View } from 'react-native';

import { COMING_TAG } from '@/backup/copy';
import { COMING_TAG_PAD_X, COMING_TAG_PAD_Y } from '@/backup/interest';
import { useTheme } from '@/theme';

type Props = {
  /** Sheet title uses labelSmall. The Deg row uses eyebrow. */
  variant: 'sheet' | 'row';
};

/**
 * «Kommer kanskje». Same chip as the old Beta mark: tertiary fill, secondary text, pill.
 * The parent owns the accessible name, so the chip itself is silent.
 */
export function ComingTag({ variant }: Props) {
  const { theme } = useTheme();
  const type = variant === 'sheet' ? theme.text.labelSmall : theme.text.eyebrow;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.chip,
        {
          backgroundColor: theme.color.button['tertiary-bg'],
          borderRadius: theme.radius.pill,
        },
      ]}
    >
      <Text style={[type, { color: theme.color.text.secondary }]}>{COMING_TAG}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: COMING_TAG_PAD_X,
    paddingVertical: COMING_TAG_PAD_Y,
    flexShrink: 0,
  },
});
