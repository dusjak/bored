import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppStateProvider } from '@/state/AppState';
import { colors, fontAssets } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts(fontAssets);

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade', // design system: fade only, no slides
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="index" options={{ contentStyle: { backgroundColor: colors.bgInverse } }} />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
          <Stack.Screen
            name="session"
            options={{
              presentation: 'fullScreenModal',
              animation: 'fade',
              gestureEnabled: false,
              contentStyle: { backgroundColor: colors.bgSession },
            }}
          />
          <Stack.Screen name="reflection" options={{ gestureEnabled: false }} />
        </Stack>
      </AppStateProvider>
    </SafeAreaProvider>
  );
}
