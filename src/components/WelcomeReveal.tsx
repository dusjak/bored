import { useEffect, type ReactNode } from 'react';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

import { useAppState } from '@/state/AppState';

const SPRING = { damping: 28, stiffness: 260, mass: 1 };
const STAGGER_MS = 60;

/** Welcome blocks rise in after «Sluket» hands off. Reduce Motion shows them at rest. */
export function WelcomeReveal({ index, children }: { index: number; children: ReactNode }) {
  const { introPhase } = useAppState();
  const reduceMotion = useReducedMotion();
  const y = useSharedValue(introPhase === 'play' ? 12 : 0);
  const opacity = useSharedValue(introPhase === 'play' ? 0 : 1);

  useEffect(() => {
    if (introPhase === 'enter' && !reduceMotion) {
      y.value = 12;
      opacity.value = 0;
      y.value = withDelay(index * STAGGER_MS, withSpring(0, SPRING));
      opacity.value = withDelay(index * STAGGER_MS, withSpring(1, SPRING));
      return;
    }
    if (introPhase !== 'play') {
      cancelAnimation(y);
      cancelAnimation(opacity);
      y.value = 0;
      opacity.value = 1;
    }
  }, [index, introPhase, opacity, reduceMotion, y]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}
