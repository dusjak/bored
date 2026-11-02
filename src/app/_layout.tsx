import { useEffect, useLayoutEffect, useRef } from 'react';
import { View } from 'react-native';
import { useFonts } from 'expo-font';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SluketSplash } from '@/components/SluketSplash';
import { StillSplash } from '@/components/StillSplash';
import { REDUCE_FADE_MS, SPLASH_BG, STILL_HOLD_MS } from '@/splash/splashTiming';
import { splashSuppressed } from '@/splash/splashDecision';
import { AppStateProvider, useAppState } from '@/state/AppState';
import { fontAssets, ThemeProvider, useTheme } from '@/theme';

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
  const {
    ready,
    introPhase,
    splashOccasion,
    splashHoldArmed,
    setIntroPhase,
    markSplashSeen,
    setSplashSuppressed,
    launch,
    activeSession,
  } = useAppState();
  const pathname = usePathname();
  const { ready: themeReady, theme } = useTheme();
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

  // The wordmark overlay is already in this commit. Hide the native splash after it mounts.
  useLayoutEffect(() => {
    if (!open) return;
    SplashScreen.hideAsync().catch(() => undefined);
  }, [open]);

  const splash = (
    <SluketSplash
      occasion={splashOccasion}
      fading={introPhase === 'fade'}
      armed={open && splashHoldArmed}
      holdMs={STILL_HOLD_MS}
      fadeMs={REDUCE_FADE_MS}
      elapsedMs={() => Math.max(0, Date.now() - startedAt.current)}
      onHandoff={setIntroPhase}
      onDismiss={() => setIntroPhase('off')}
      onCrash={markSplashSeen}
    />
  );

  if (!open) {
    return (
      <View style={{ flex: 1, backgroundColor: SPLASH_BG }}>
        <StillSplash
          fading={false}
          armed={false}
          holdMs={STILL_HOLD_MS}
          fadeMs={REDUCE_FADE_MS}
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
