import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { OnboardingHeader } from '@/components/OnboardingHeader';
import { Screen } from '@/components/Screen';
import { useAppState } from '@/state/AppState';
import { useTheme } from '@/theme';

export default function NameStep() {
  const { theme } = useTheme();
  const { user, updateUser } = useAppState();
  const [name, setName] = useState(user.name ?? '');

  const next = (value: string) => {
    updateUser({ name: value });
    router.push('/onboarding/notifications');
  };

  return (
    <Screen top="none" contentStyle={{ paddingBottom: 40 }}>
      <OnboardingHeader step={5} title="Hva skal vi kalle deg?" sub="Bare fornavn holder." />
      <TextInput
        autoFocus
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="next"
        placeholder="Navn"
        placeholderTextColor={theme.color.text.tertiary}
        accessibilityLabel="Navn"
        value={name}
        onChangeText={setName}
        onSubmitEditing={() => name.trim() && next(name.trim())}
        style={[
          styles.input,
          theme.text.bodyLarge,
          { color: theme.color.text.primary, borderBottomColor: theme.color.border.strong },
        ]}
      />
      <View style={{ flex: 1 }} />
      <Button title="Fortsett" disabled={!name.trim()} onPress={() => next(name.trim())} />
      <Button title="Hopp over" variant="ghost" style={{ marginTop: 8 }} onPress={() => next('')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    fontSize: 22,
    paddingVertical: 8,
    borderBottomWidth: 1,
    minHeight: 44,
  },
});
