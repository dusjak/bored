import { useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { WordmarkImage } from '@/components/WordmarkImage';
import { SPLASH_BG } from '@/splash/splashTiming';

export type SplashProps = {
  /** Parent has asked the overlay to leave. The exit is a cut, not a fade. */
  fading: boolean;
  /** False keeps the image up without starting the hold (mounted under the native splash, or while backgrounded). */
  armed: boolean;
  holdMs: number;
  fadeMs: number;
  onHandoff: (mode: 'enter' | 'fade') => void;
  onDismiss: () => void;
};

/**
 * Static wordmark. Always splash-wordmark-dark.png on #111110, centred on the full window.
 * Hold, then a hard cut. Tap skips. No theme read and no Text.
 * v4 §0: a fade of this dark plate over a light screen would be a grey frame.
 */
export function StillSplash({ fading, armed, holdMs, onHandoff, onDismiss }: SplashProps) {
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
    if (!fading) handed.current = false;
  }, [fading]);

  useEffect(() => {
    if (!armed || fading) return;
    const timer = setTimeout(handoff, holdMs);
    return () => clearTimeout(timer);
  }, [armed, fading, handoff, holdMs]);

  useEffect(() => {
    if (!fading) return;
    dismiss();
  }, [dismiss, fading]);

  return (
    <View accessibilityViewIsModal style={[styles.layer, { backgroundColor: SPLASH_BG }]}>
      <StatusBar style="light" />
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
          <WordmarkImage />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 20 },
  press: { flex: 1 },
});
