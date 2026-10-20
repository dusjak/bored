import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

/** Step indicator. The label carries the state; the dots are decorative. */
export function ProgressDots({ total, current }: { total: number; current: number }) {
  const { theme } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`Trinn ${current + 1} av ${total}`}
      style={styles.row}
    >
      {Array.from({ length: total }).map((_, index) => {
        const active = index === current;
        const done = index < current;
        return (
          <View
            key={index}
            importantForAccessibility="no"
            style={[
              styles.dot,
              {
                width: active ? 24 : 6,
                borderRadius: 3,
                backgroundColor: done || active ? theme.color.ink.default : theme.color.control.off,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { height: 6 },
});
