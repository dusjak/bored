import { StyleSheet, View } from 'react-native';

import { colors, palette } from '@/theme';

export function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i < current && { backgroundColor: colors.accent },
            i === current && { backgroundColor: colors.fg, width: 20 },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  dot: { height: 4, width: 4, borderRadius: 2, backgroundColor: palette.mono400 },
});
