import { useEffect, useRef } from 'react';
import { Stack, usePathname } from 'expo-router';
import { useReducedMotion } from 'react-native-reanimated';

import { onboardingSpor } from '@/analytics/track';
import { onboardingBeats, onboardingStepName } from '@/analytics/screens';
import { stepDirection } from '@/onboarding/stepMotion';
import { useTheme } from '@/theme';

function OnboardingAnalytics() {
  const pathname = usePathname();
  const previous = useRef<string | null>(null);
  useEffect(() => {
    const next = onboardingStepName(pathname);
    for (const beat of onboardingBeats(previous.current, next, stepDirection())) {
      onboardingSpor(beat);
    }
    if (next) previous.current = next;
  }, [pathname]);
  return null;
}

export default function OnboardingLayout() {
  const { theme } = useTheme();
  const reduceMotion = useReducedMotion();
  return (
    <>
    <OnboardingAnalytics />
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
    </>
  );
}
