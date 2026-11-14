import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

/** Deg stack. Sikkerhetskopi is a sheet on this screen, not a pushed route. */
export default function ProfileLayout() {
  const { theme } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.color.bg.default },
      }}
    />
  );
}
