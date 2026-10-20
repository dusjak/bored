import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';

/** Spec spring: damping ratio ≈ 0.87, almost no overshoot. */
const SPRING = { damping: 28, stiffness: 260, mass: 1 } as const;

export const SUBTITLE_SLIDE_OFFSET = 12;
const CARD_SLIDE_BASE = 24;
const CARD_SLIDE_STEP = 8;
const SLIDE_STAGGER_MS = 40;
const SLIDE_STAGGER_MAX_MS = 160;

export function cardSlideOffset(index: number) {
  return CARD_SLIDE_BASE + CARD_SLIDE_STEP * index;
}

export function cardSlideDelay(index: number) {
  return Math.min(SLIDE_STAGGER_MS * index, SLIDE_STAGGER_MAX_MS);
}

type Props = {
  /** Starting translateX, in px. Springs to 0. */
  offset: number;
  delay: number;
  children: ReactNode;
};

/**
 * Catch-up slide for a screen that was just pushed.
 * The previous screen stays mounted, so a swipe back does not replay this.
 * Reduce Motion skips the offset. No opacity.
 */
export function ForwardSlide({ offset, delay, children }: Props) {
  const reduceMotion = useReducedMotion();
  const x = useSharedValue(reduceMotion ? 0 : offset);

  useEffect(() => {
    if (reduceMotion) return;
    x.value = withDelay(delay, withSpring(0, SPRING));
  }, [delay, offset, reduceMotion, x]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  if (reduceMotion) return <View>{children}</View>;
  return <Animated.View style={style}>{children}</Animated.View>;
}
