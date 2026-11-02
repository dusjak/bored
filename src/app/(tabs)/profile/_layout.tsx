import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

/** Deg stack. Sikkerhetskopi uses the same screen as the Logg push. */
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
