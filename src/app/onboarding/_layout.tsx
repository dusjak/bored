import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

export default function OnboardingLayout() {
  const { theme } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: theme.color.bg.default },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="ready" options={{ contentStyle: { backgroundColor: theme.color.bg.session } }} />
    </Stack>
  );
}
