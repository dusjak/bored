import { useCallback, useEffect, useRef } from 'react';
import { View } from 'react-native';
import { useFonts } from 'expo-font';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SluketSplash } from '@/components/SluketSplash';
import { StillSplash } from '@/components/StillSplash';
import { exitFadeMs, SPLASH_BG } from '@/splash/splashTiming';
import { splashSuppressed } from '@/splash/splashDecision';
import { AppStateProvider, useAppState } from '@/state/AppState';
import { BackupProvider } from '@/state/BackupState';
import { fontAssets, ThemeProvider, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts(fontAssets);

  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppStateProvider>
          <BackupProvider>
            <ReadyGate />
          </BackupProvider>
        </AppStateProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function ReadyGate() {
  const {
    ready,
    introPhase,
    splashOccasion,
    splashCalm,
    splashHoldArmed,
    setIntroPhase,
    markSplashSeen,
    setSplashSuppressed,
    launch,
    activeSession,
  } = useAppState();
  const pathname = usePathname();
  const { ready: themeReady, theme } = useTheme();
  const darkTheme = theme.name === 'dark';
  const open = ready && themeReady;
  const suppressed = splashSuppressed({
    pathname,
    launch,
    activeSession: activeSession != null,
  });
  setSplashSuppressed(suppressed);

  const cover = introPhase === 'play' || introPhase === 'still' || introPhase === 'fade';
  const startedAt = useRef(Date.now());
  useEffect(() => {
    if (introPhase === 'play') startedAt.current = Date.now();
  }, [introPhase]);

  const hideNative = useCallback(() => {
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  // No overlay (a session or reflection): nothing will paint a plate, so hide now.
  // Otherwise wait until that plate has drawn, or the native logo cuts to an empty frame.
  useEffect(() => {
    if (!open || cover) return;
    hideNative();
  }, [cover, hideNative, open]);

  const splash = (
    <SluketSplash
      occasion={splashOccasion}
      calmSplash={splashCalm}
      darkTheme={darkTheme}
      fading={introPhase === 'fade'}
      armed={open && splashHoldArmed}
      elapsedMs={() => Math.max(0, Date.now() - startedAt.current)}
      onHandoff={setIntroPhase}
      onDismiss={() => setIntroPhase('off')}
      onCrash={markSplashSeen}
      onFirstPaint={hideNative}
    />
  );

  if (!open) {
    return (
      <View style={{ flex: 1, backgroundColor: SPLASH_BG }}>
        <StillSplash
          fading={false}
          armed={false}
          holdMs={0}
          fadeMs={exitFadeMs(darkTheme)}
          onHandoff={() => undefined}
          onDismiss={() => undefined}
        />
      </View>
    );
  }

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
      {cover ? splash : null}
    </View>
  );
}
