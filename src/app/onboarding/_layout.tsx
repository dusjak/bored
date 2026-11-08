import { Stack } from 'expo-router';
import { useReducedMotion } from 'react-native-reanimated';

import { PART1_ROUTES } from '@/onboarding/flow';
import { useTheme } from '@/theme';

/** Part 1 has no interactive pop. The duration and form pans own the drag. */
const part1Gesture = { gestureEnabled: false, fullScreenGestureEnabled: false } as const;

export default function OnboardingLayout() {
  const { theme } = useTheme();
  const reduceMotion = useReducedMotion();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        contentStyle: { backgroundColor: theme.color.bg.default },
        // System push. Reduce Motion keeps a short crossfade and no content offset.
        ...(reduceMotion
          ? { animation: 'fade' as const, animationDuration: 200 }
          : { animation: 'default' as const }),
      }}
    >
      {PART1_ROUTES.map((name) => (
        <Stack.Screen key={name} name={name} options={part1Gesture} />
      ))}
      <Stack.Screen name="ready" options={{ contentStyle: { backgroundColor: theme.color.bg.session } }} />
    </Stack>
  );
}
