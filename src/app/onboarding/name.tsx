import { useEffect, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { OnboardingHeader } from '@/components/OnboardingHeader';
import { Screen } from '@/components/Screen';
import { useAppState } from '@/state/AppState';
import { useTheme } from '@/theme';

export default function NameStep() {
  const { theme } = useTheme();
  const { user, updateUser } = useAppState();
  const { after } = useLocalSearchParams<{ after?: string }>();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(user.name ?? '');
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, () => setKeyboardOpen(true));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const next = (value: string) => {
    updateUser({ name: value });
    const skipped = after === 'ready' || user.introPath === 'skip';
    router.push(skipped ? '/onboarding/ready' : '/onboarding/notifications');
  };

  return (
    <Screen top="none" edges={['top']}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
      <View style={{ paddingBottom: keyboardOpen ? 0 : 40 + insets.bottom }}>
        <Button title="Fortsett" disabled={!name.trim()} onPress={() => next(name.trim())} />
        <Button title="Hopp over" variant="ghost" style={{ marginTop: 8 }} onPress={() => next('')} />
      </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  input: {
    fontSize: 22,
    paddingVertical: 8,
    borderBottomWidth: 1,
    minHeight: 44,
  },
});
