import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

/** Logg stack. Sikkerhetskopi is pushed here so the back label can read «Logg». */
export default function LogLayout() {
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
