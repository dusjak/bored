import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { HOME_UNEASE_BODY, HOME_UNEASE_TITLE } from '@/onboarding/flow';
import { useTheme } from '@/theme';
import { Icon } from './Icon';

/**
 * Closed row 10pt above Start. The body grows upward. Start does not move.
 * Colors are the only specified pair for this sentence. The dark still was not in the package.
 */
export function HomeUnease() {
  const { theme } = useTheme();
  const reduceMotion = useReducedMotion() === true;
  const [open, setOpen] = useState(false);
  return (
    <View
      style={[
        styles.box,
        { backgroundColor: '#FBEFD9', marginBottom: 10 },
        reduceMotion ? null : null,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={HOME_UNEASE_TITLE}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
        style={styles.row}
      >
        <Text style={[theme.text.label, styles.copy, { color: '#765129' }]}>{HOME_UNEASE_TITLE}</Text>
        <View style={{ transform: [{ rotate: open ? '0deg' : '180deg' }] }}>
          <Icon name="chevronDown" size={16} color="#765129" />
        </View>
      </Pressable>
      {open ? (
        <Text style={[theme.text.bodySmall, styles.body, { color: '#765129' }]}>{HOME_UNEASE_BODY}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: 14, overflow: 'hidden' },
  row: {
    minHeight: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  copy: { flex: 1, paddingRight: 12 },
  body: { paddingHorizontal: 16, paddingBottom: 14, lineHeight: 22 },
});
