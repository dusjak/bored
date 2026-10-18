import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';

import { colors, palette } from '@/theme';

/** 44x26 pill toggle. Off: mono400, on: near-black. */
export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const x = useRef(new Animated.Value(value ? 20 : 2)).current;
  useEffect(() => {
    Animated.timing(x, { toValue: value ? 20 : 2, duration: 300, useNativeDriver: true }).start();
  }, [value, x]);

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={[styles.track, { backgroundColor: value ? colors.fg : palette.mono400 }]}
    >
      <Animated.View style={[styles.thumb, { transform: [{ translateX: x }] }]} />
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
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
});
