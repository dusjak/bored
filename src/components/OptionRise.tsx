import { useCallback, type ReactNode } from 'react';
import { useFocusEffect } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { stepDirection } from '@/onboarding/stepMotion';

const EASE = Easing.bezier(0.2, 0, 0, 1);
const ENTER = 8;

/** The option-page entrance. Back plays the same timing from the opposite side. */
export function OptionRise({ delay, duration = 320, children }: { delay: number; duration?: number; children: ReactNode }) {
  const reduceMotion = useReducedMotion() === true;
  const back = stepDirection() === 'back';
  const y = useSharedValue(reduceMotion ? 0 : back ? -ENTER : ENTER);
  const opacity = useSharedValue(reduceMotion ? 1 : 0);

  useFocusEffect(
    useCallback(() => {
      if (reduceMotion) {
        y.value = 0;
        opacity.value = 1;
        return;
      }
      const from = stepDirection() === 'back' ? -ENTER : ENTER;
      y.value = from;
      opacity.value = 0;
      y.value = withDelay(delay, withTiming(0, { duration, easing: EASE }));
      opacity.value = withDelay(delay, withTiming(1, { duration, easing: EASE }));
      return () => {
        if (stepDirection() !== 'back') return;
        y.value = withTiming(ENTER, { duration, easing: EASE });
        opacity.value = withTiming(0, { duration, easing: EASE });
      };
    }, [delay, duration, opacity, reduceMotion, y]),
  );

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}
