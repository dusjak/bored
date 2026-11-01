import { useCallback, useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { WordmarkImage } from '@/components/WordmarkImage';
import { REDUCE_FADE_MS } from '@/splash/splashTiming';
import { useTheme } from '@/theme';

export type SplashProps = {
  /** Parent has asked the overlay to crossfade out. */
  fading: boolean;
  /** False keeps the image up without starting the hold (mounted under the native splash, or while backgrounded). */
  armed: boolean;
  holdMs: number;
  fadeMs: number;
  onHandoff: (mode: 'enter' | 'fade') => void;
  onDismiss: () => void;
};

/**
 * Static wordmark. Same PNG as the native splash, centred on the full window.
 * Hold, then a 200 ms fade. Tap skips. No Reanimated worklets and no Text.
 */
export function StillSplash({ fading, armed, holdMs, fadeMs, onHandoff, onDismiss }: SplashProps) {
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
    if (!fading) {
      handed.current = false;
      opacity.setValue(1);
    }
  }, [fading, opacity]);

  useEffect(() => {
    if (!armed || fading) return;
    const timer = setTimeout(handoff, holdMs);
    return () => clearTimeout(timer);
  }, [armed, fading, handoff, holdMs]);

  useEffect(() => {
    if (!fading) return;
    const fade = Animated.timing(opacity, {
      toValue: 0,
      duration: fadeMs,
      easing: Easing.bezier(0.4, 0, 1, 1),
      useNativeDriver: true,
    });
    fade.start(({ finished }) => {
      if (finished) dismiss();
    });
    return () => fade.stop();
  }, [dismiss, fadeMs, fading, opacity]);

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
        onPress={() => {
          if (armed) handoff();
        }}
        style={styles.press}
      >
        <View pointerEvents="none" style={styles.press}>
          <WordmarkImage scheme={theme.name} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

export const STILL_FADE_MS = REDUCE_FADE_MS;

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 20 },
  press: { flex: 1 },
});
