import { Component, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated from 'react-native-reanimated';

import { usePlateExit } from '@/components/usePlateExit';
import { WordmarkImage } from '@/components/WordmarkImage';
import { SPLASH_BG } from '@/splash/splashTiming';

export type SplashProps = {
  /** Parent has asked the overlay to leave. fadeMs 0 cuts. Otherwise the plate fades. */
  fading: boolean;
  /** False keeps the plate up without starting the hold (under the native splash, or while backgrounded). */
  armed: boolean;
  holdMs: number;
  fadeMs: number;
  onHandoff: (mode: 'enter' | 'fade') => void;
  onDismiss: () => void;
  /** First painted frame. The native splash hides after this, so the plate is already up. */
  onFirstPaint?: () => void;
};

type BoundaryProps = {
  children: ReactNode;
  onFirstPaint?: () => void;
};

type BoundaryState = { failed: boolean };

/** Skia failed to draw S6. The raster plate is the same logo, centred the same way. */
class MarkFallback extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  componentDidCatch(): void {
    this.props.onFirstPaint?.();
  }

  render() {
    if (this.state.failed) return <WordmarkImage />;
    return this.props.children;
  }
}

function SplashMark({ onFirstPaint }: { onFirstPaint?: () => void }) {
  const mark = require('./S6Mark') as typeof import('./S6Mark');
  return <mark.S6Mark onFirstPaint={onFirstPaint} />;
}

/**
 * Dråpe. Static S6 wordmark, always #F8F6F2 on #111110, centred on the full window.
 * Hold, then leave: a cut when fadeMs is 0, otherwise a 200 ms fade.
 * Tap skips. The plate does not read the theme. No Text.
 */
export function StillSplash({ fading, armed, holdMs, fadeMs, onHandoff, onDismiss, onFirstPaint }: SplashProps) {
  const handed = useRef(false);
  const onHandoffRef = useRef(onHandoff);
  onHandoffRef.current = onHandoff;
  const plate = usePlateExit(fading, fadeMs, onDismiss);

  const handoff = useCallback(() => {
    if (handed.current) return;
    handed.current = true;
    onHandoffRef.current('fade');
  }, []);

  useEffect(() => {
    if (!fading) handed.current = false;
  }, [fading]);

  useEffect(() => {
    if (!armed || fading) return;
    const timer = setTimeout(handoff, holdMs);
    return () => clearTimeout(timer);
  }, [armed, fading, handoff, holdMs]);

  return (
    <Animated.View accessibilityViewIsModal style={[styles.layer, { backgroundColor: SPLASH_BG }, plate]}>
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
        <MarkFallback onFirstPaint={armed ? onFirstPaint : undefined}>
          <SplashMark onFirstPaint={armed ? onFirstPaint : undefined} />
        </MarkFallback>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 20 },
  press: { flex: 1 },
});
