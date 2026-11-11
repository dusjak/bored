import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { ScreenTitle } from '@/components/ScreenTitle';
import { WelcomeReveal } from '@/components/WelcomeReveal';
import { easBuildProfile, isDevBuild } from '@/config/buildProfile';
import { isSplashReplayEnabled } from '@/config/features';
import { useAppState } from '@/state/AppState';
import { useTheme } from '@/theme';

/** Hidden replay. Dev and TestFlight only. A production profile, or a missing profile, stays off. */
export const SPLASH_REPLAY_HOLD_MS = 2000;

/** First screen. No account link, no skip, no back arrow. */
export default function MeetKlumpen() {
  const { theme } = useTheme();
  const { replayIntroSplash } = useAppState();
  const replay = isSplashReplayEnabled(isDevBuild(), easBuildProfile());

  return (
    <Screen top="app" contentStyle={styles.content}>
      <View>
        <WelcomeReveal index={0}>
          <Pressable
            accessibilityRole="header"
            delayLongPress={SPLASH_REPLAY_HOLD_MS}
            onLongPress={replay ? () => replayIntroSplash() : undefined}
          >
            <ScreenTitle variant="display" style={{ marginBottom: 8 }}>
              {'Ingenting\ner målet.'}
            </ScreenTitle>
          </Pressable>
        </WelcomeReveal>
        <WelcomeReveal index={1}>
          <Text style={[theme.text.body, { color: theme.color.text.secondary }]}>
            Hjernen din trenger pauser fra stimuli. Ikke meditasjon. Ikke pusteteknikker. Bare litt kjedsomhet — bevisst
            og regelmessig.
          </Text>
        </WelcomeReveal>
      </View>
      <View style={styles.spacer} />
      <WelcomeReveal index={2}>
        <Button title="Kom i gang" onPress={() => router.push('/onboarding/kjedomhet')} />
      </WelcomeReveal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  spacer: { flex: 1 },
});
