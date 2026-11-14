import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

/** Step indicator. The label carries the state; the dots are decorative. */
export function ProgressDots({
  total,
  current,
  activeColor,
  idleColor,
}: {
  total: number;
  current: number;
  activeColor?: string;
  idleColor?: string;
}) {
  const { theme } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`Steg ${current + 1} av ${total}`}
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
                width: active ? 20 : 4,
                borderRadius: 2,
                backgroundColor: done || active ? (activeColor ?? theme.color.ink.default) : (idleColor ?? theme.color.control.off),
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  dot: { height: 4 },
});
