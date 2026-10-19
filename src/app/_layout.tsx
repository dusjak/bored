import { useEffect } from 'react';
import { View } from 'react-native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SluketSplash } from '@/components/SluketSplash';
import { AppStateProvider, useAppState } from '@/state/AppState';
import { fontAssets, ThemeProvider, useTheme } from '@/theme';

import '@/data/notifications';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts(fontAssets);

  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppStateProvider>
          <ReadyGate />
        </AppStateProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function ReadyGate() {
  const { ready, introPhase, setIntroPhase } = useAppState();
  const { ready: themeReady, theme } = useTheme();
  const open = ready && themeReady;
  const cover = introPhase === 'play' || introPhase === 'fade';

  useEffect(() => {
    if (open) SplashScreen.hideAsync();
  }, [open]);

  if (!open) return <View style={{ flex: 1, backgroundColor: theme.color.bg.default }} />;

  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          // Replaces (splash, Ready, reset) are a hard cut. A fade between light and dark leaves a grey frame.
          animation: 'none',
          contentStyle: { backgroundColor: theme.color.bg.default },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
        <Stack.Screen
          name="session"
          options={{
            presentation: 'fullScreenModal',
            gestureEnabled: false,
            contentStyle: { backgroundColor: theme.color.bg.session },
          }}
        />
        <Stack.Screen name="reflection" options={{ gestureEnabled: false }} />
      </Stack>
      {cover ? (
        <SluketSplash
          fading={introPhase === 'fade'}
          onHandoff={setIntroPhase}
          onDismiss={() => setIntroPhase('off')}
        />
      ) : null}
    </View>
  );
}
