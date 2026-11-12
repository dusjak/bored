import { useEffect, type ReactNode } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

const EASE = Easing.bezier(0.2, 0, 0, 1);

/** The option-page entrance. Every choice list uses this, including the duration cards. */
export function OptionRise({ delay, duration = 320, children }: { delay: number; duration?: number; children: ReactNode }) {
  const reduceMotion = useReducedMotion() === true;
  const y = useSharedValue(reduceMotion ? 0 : 8);
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) return;
    y.value = withDelay(delay, withTiming(0, { duration, easing: EASE }));
    opacity.value = withDelay(delay, withTiming(1, { duration, easing: EASE }));
  }, [delay, duration, opacity, reduceMotion, y]);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}
