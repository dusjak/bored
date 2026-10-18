import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { Logo } from '@/components/Logo';
import { Screen } from '@/components/Screen';
import { type } from '@/theme';

/** Welcome screen. */
export default function Welcome() {
  return (
    <Screen contentStyle={styles.content}>
      <View style={{ marginTop: 32 }}>
        <Logo size={22} />
      </View>
      <View>
        <Text style={[type.display(40, 1.1), { marginBottom: 20 }]}>{'Ingenting\ner målet.'}</Text>
        <Text style={type.body}>
          Hjernen din trenger pauser fra stimuli. Ikke meditasjon. Ikke pusteteknikker. Bare litt kjedsomhet — bevisst
          og regelmessig.
        </Text>
      </View>
      <View style={{ gap: 10 }}>
        <Button title="Kom i gang" onPress={() => router.push('/onboarding/distraction')} />
        {/* TODO: login/accounts not implemented */}
        <Button title="Jeg har allerede en konto" variant="ghost" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 32, paddingTop: 20, paddingBottom: 40, justifyContent: 'space-between' },
});
