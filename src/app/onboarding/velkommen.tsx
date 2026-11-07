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

/** Existing welcome, without a name and without the unease box. */
export default function Velkommen() {
  const { theme } = useTheme();
  const { replayIntroSplash } = useAppState();
  const replaySplash = isSplashReplayEnabled(isDevBuild(), easBuildProfile());
  return (
    <Screen top="welcome" contentStyle={styles.content}>
      <View>
        <WelcomeReveal index={0}>
          <ScreenTitle variant="display" style={{ marginBottom: 8 }}>
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
          <Button title="Kom i gang" onPress={() => router.push('/onboarding/veiskille')} />
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
  content: { paddingBottom: 40 },
  spacer: { flex: 1 },
});
