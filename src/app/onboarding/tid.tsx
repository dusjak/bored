import { Text } from 'react-native';
import { router } from 'expo-router';

import { DurationChooser } from '@/components/DurationChooser';
import { Screen } from '@/components/Screen';
import { ScreenTitle } from '@/components/ScreenTitle';
import { confirmedMinutes, GUESS_HELP, GUESS_HINT, GUESS_TITLE } from '@/onboarding/flow';
import { useAppState } from '@/state/AppState';
import { useTheme } from '@/theme';

/** Guess on the fixed Gummi pictures. Right grows the time. The row stays hidden. */
export default function TidStep() {
  const { theme } = useTheme();
  const { user, updateUser, setDurationMinutes } = useAppState();
  const current = confirmedMinutes(user.duration);

  const save = (minutes: number) => {
    updateUser({ duration: String(minutes), materialId: user.materialId ?? 'gummi' });
    void setDurationMinutes(minutes);
    router.push('/onboarding/ov');
  };

  return (
    <Screen top="app" contentStyle={{ paddingBottom: 24 }}>
      <ScreenTitle style={{ marginBottom: 8 }}>{GUESS_TITLE}</ScreenTitle>
      <Text style={[theme.text.body, { color: theme.color.text.secondary }]}>{GUESS_HELP}</Text>
      <DurationChooser
        minutes={current}
        showChoices={false}
        hint={GUESS_HINT}
        confirmTitle="Velg tiden"
        onConfirm={save}
      />
    </Screen>
  );
}
