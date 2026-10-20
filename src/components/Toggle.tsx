import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/theme';

/** 44x26 switch. The track is at least a 44pt target. */
export function Toggle({
  value,
  onChange,
  accessibilityLabel,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
  accessibilityLabel?: string;
}) {
  const { theme } = useTheme();
  const x = useRef(new Animated.Value(value ? 20 : 2)).current;
  useEffect(() => {
    Animated.timing(x, { toValue: value ? 20 : 2, duration: 200, useNativeDriver: true }).start();
  }, [value, x]);

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      hitSlop={{ top: 9, bottom: 9 }}
      style={[styles.track, { backgroundColor: value ? theme.color.ink.default : theme.color.control.off }]}
    >
      <Animated.View style={[styles.thumb, { backgroundColor: theme.color.surface.default, transform: [{ translateX: x }] }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: 44, height: 26, borderRadius: 13, justifyContent: 'center' },
  thumb: {
    position: 'absolute',
    left: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
  },
});
