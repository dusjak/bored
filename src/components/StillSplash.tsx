import { useCallback, useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { REDUCE_FADE_MS, REDUCE_HOLD_MS } from '@/splash/splashTiming';
import { useTheme } from '@/theme';

const WORD_SIZE = 52;

export type SplashProps = {
  /** Parent has asked the overlay to crossfade out. */
  fading: boolean;
  onHandoff: (mode: 'enter' | 'fade') => void;
  onDismiss: () => void;
};

/**
 * Reduce Motion splash, and the splash shipped while features.sluketAnimation is off.
 * Solid «bored.» (word and period, one colour) on the theme background.
 * Hold, then a plain Animated fade. No Reanimated worklets.
 */
export function StillSplash({ fading, onHandoff, onDismiss }: SplashProps) {
  const { theme } = useTheme();
  const opacity = useRef(new Animated.Value(1)).current;
  const handed = useRef(false);
  const onHandoffRef = useRef(onHandoff);
  const onDismissRef = useRef(onDismiss);
  onHandoffRef.current = onHandoff;
  onDismissRef.current = onDismiss;

  const handoff = useCallback(() => {
    if (handed.current) return;
    handed.current = true;
    onHandoffRef.current('fade');
  }, []);

  const dismiss = useCallback(() => {
    onDismissRef.current();
  }, []);

  useEffect(() => {
    const timer = setTimeout(handoff, REDUCE_HOLD_MS);
    return () => clearTimeout(timer);
  }, [handoff]);

  useEffect(() => {
    if (!fading) return;
    const fade = Animated.timing(opacity, {
      toValue: 0,
      duration: REDUCE_FADE_MS,
      useNativeDriver: true,
    });
    fade.start(({ finished }) => {
      if (finished) dismiss();
    });
    return () => fade.stop();
  }, [dismiss, fading, opacity]);

  return (
    <Animated.View
      accessibilityViewIsModal
      style={[styles.layer, { opacity, backgroundColor: theme.color.bg.default }]}
    >
      <StatusBar style={theme.statusBar} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="bored"
        accessibilityHint="Trykk for å hoppe over"
        onPress={handoff}
        style={styles.press}
      >
        <Text
          style={{
            fontFamily: theme.fonts.serifItalic,
            fontSize: WORD_SIZE,
            lineHeight: WORD_SIZE + 8,
            color: theme.color.text.primary,
          }}
        >
          bored.
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 20 },
  press: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
