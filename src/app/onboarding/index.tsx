import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { Logo } from '@/components/Logo';
import { Screen } from '@/components/Screen';
import { WelcomeReveal } from '@/components/WelcomeReveal';
import { useTheme } from '@/theme';

/** Welcome screen. */
export default function Welcome() {
  const { theme } = useTheme();
  return (
    <Screen contentStyle={styles.content}>
      <WelcomeReveal index={0}>
        <View style={{ marginTop: 32 }}>
          <Logo size={22} />
        </View>
      </WelcomeReveal>
      <View>
        <WelcomeReveal index={1}>
          <Text style={[theme.text.display, { color: theme.color.text.primary, marginBottom: 20 }]}>
            {'Ingenting\ner målet.'}
          </Text>
        </WelcomeReveal>
        <WelcomeReveal index={2}>
          <Text style={[theme.text.body, { color: theme.color.text.secondary }]}>
            Hjernen din trenger pauser fra stimuli. Ikke meditasjon. Ikke pusteteknikker. Bare litt kjedsomhet — bevisst
            og regelmessig.
          </Text>
        </WelcomeReveal>
      </View>
      <WelcomeReveal index={3}>
        <View style={{ gap: 10 }}>
          <Button title="Kom i gang" onPress={() => router.push('/onboarding/distraction')} />
          <Button title="Jeg har allerede en konto" variant="ghost" />
        </View>
      </WelcomeReveal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40, justifyContent: 'space-between' },
});
