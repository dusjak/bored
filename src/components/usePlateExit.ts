import { useCallback, useEffect, useRef } from 'react';
import {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { EXIT_FADE_BEZIER } from '@/splash/splashTiming';

/**
 * Leaves the dark plate. fadeMs 0 is a cut (a light app under the plate).
 * Otherwise opacity runs 1 → 0 on cubic-bezier(0.4, 0, 1, 1).
 */
export function usePlateExit(fading: boolean, fadeMs: number, onDismiss: () => void) {
  const opacity = useSharedValue(1);
  const onDismissRef = useRef(onDismiss);
  const alive = useRef(true);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const dismiss = useCallback(() => {
    if (!alive.current) return;
    onDismissRef.current();
  }, []);

  useEffect(() => {
    if (!fading) {
      opacity.value = 1;
      return;
    }
    if (fadeMs <= 0) {
      dismiss();
      return;
    }
    opacity.value = withTiming(
      0,
      { duration: fadeMs, easing: Easing.bezier(EXIT_FADE_BEZIER[0], EXIT_FADE_BEZIER[1], EXIT_FADE_BEZIER[2], EXIT_FADE_BEZIER[3]) },
      (finished) => {
        if (finished) runOnJS(dismiss)();
      },
    );
  }, [dismiss, fadeMs, fading, opacity]);

  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}
