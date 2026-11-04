import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { ScreenTitle } from '@/components/ScreenTitle';
import { WelcomeReveal } from '@/components/WelcomeReveal';
import { easBuildProfile, isDevBuild } from '@/config/buildProfile';
import { isSplashReplayEnabled } from '@/config/features';
import { useAppState } from '@/state/AppState';
import { useTheme } from '@/theme';

/** Welcome screen. */
export default function Welcome() {
  const { theme } = useTheme();
  const { replayIntroSplash } = useAppState();
  // TODO: The real existing-account flow replaces this.
  // Temporary test hook: replay the full first-launch Sluket and stay on this screen.
  // No stored data changes. Off unless __DEV__ or a non-production EAS profile.
  const replaySplash = isSplashReplayEnabled(isDevBuild(), easBuildProfile());
  return (
    <Screen top="welcome" contentStyle={styles.content}>
      <View>
        <WelcomeReveal index={0}>
          <ScreenTitle variant="display" style={{ marginBottom: 20 }}>
            {'Ingenting\ner målet.'}
          </ScreenTitle>
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
        <View style={{ gap: 10 }}>
          <Button title="Kom i gang" onPress={() => router.push('/onboarding/distraction')} />
          <Button
            title="Jeg har allerede en konto"
            variant="ghost"
            onPress={replaySplash ? () => replayIntroSplash() : undefined}
          />
        </View>
      </WelcomeReveal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Fixed top inset from Screen. The spacer holds the actions at the bottom.
  content: { paddingBottom: 40 },
  spacer: { flex: 1 },
});
