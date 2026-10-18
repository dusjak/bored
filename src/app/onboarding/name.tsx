import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { OnboardingHeader } from '@/components/OnboardingHeader';
import { Screen } from '@/components/Screen';
import { useAppState } from '@/state/AppState';
import { colors, em, fonts } from '@/theme';

export default function NameStep() {
  const { user, updateUser } = useAppState();
  const [name, setName] = useState(user.name ?? '');

  const next = (value: string) => {
    updateUser({ name: value });
    router.push('/onboarding/notifications');
  };

  return (
    <Screen contentStyle={{ paddingBottom: 40 }}>
      <OnboardingHeader step={5} title="Hva skal vi kalle deg?" sub="Bare fornavn holder." />
      <TextInput
        autoFocus
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="next"
        placeholder="Navn"
        placeholderTextColor={colors.fgPlaceholder}
        value={name}
        onChangeText={setName}
        onSubmitEditing={() => name.trim() && next(name.trim())}
        style={styles.input}
      />
      <View style={{ flex: 1 }} />
      <Button title="Fortsett" disabled={!name.trim()} onPress={() => next(name.trim())} />
      <Button title="Hopp over" variant="ghost" style={{ marginTop: 8 }} onPress={() => next('')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    fontFamily: fonts.sansLight,
    fontSize: 22,
    letterSpacing: em(22, -0.01),
    color: colors.fg,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(17,17,16,0.18)',
  },
});
