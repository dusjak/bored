import { Stack } from 'expo-router';
import { useReducedMotion } from 'react-native-reanimated';

import { useTheme } from '@/theme';

export default function OnboardingLayout() {
  const { theme } = useTheme();
  const reduceMotion = useReducedMotion();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // A swipe must not change step. The lump owns the only pans.
        gestureEnabled: false,
        fullScreenGestureEnabled: false,
        contentStyle: { backgroundColor: theme.color.bg.default },
        // System push. Reduce Motion keeps a short crossfade and no content offset.
        animation: 'fade' as const,
        animationDuration: reduceMotion ? 200 : 320,
      }}
    >
      <Stack.Screen name="ready" options={{ contentStyle: { backgroundColor: theme.color.bg.session } }} />
    </Stack>
  );
}
