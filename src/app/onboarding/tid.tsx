import { Text, View } from 'react-native';
import { knappetrykk } from '@/analytics/track';
import { pushStep } from '@/onboarding/stepMotion';

import { DurationChooser } from '@/components/DurationChooser';
import { Screen } from '@/components/Screen';
import { ScreenTitle } from '@/components/ScreenTitle';
import { confirmedMinutes, GUESS_HELP, GUESS_HINT, GUESS_TITLE } from '@/onboarding/flow';
import { useAppState } from '@/state/AppState';
import { useTheme } from '@/theme';

/** Guess on the fixed Gummi pictures. Swipe or tap 5/10/15/20. The row does not advance the step. */
export default function TidStep() {
  const { theme } = useTheme();
  const { user, updateUser, setDurationMinutes } = useAppState();
  const current = confirmedMinutes(user.duration);

  const save = (minutes: number) => {
    knappetrykk({ type: 'Stegnavigasjon', navn: 'Velg tiden', hendelse: 'trykk', skjerm: 'Velg en tid du klarer' });
    updateUser({ duration: String(minutes), materialId: user.materialId ?? 'gummi' });
    void setDurationMinutes(minutes);
    pushStep('/onboarding/ov');
  };

  return (
    <Screen top="app" contentStyle={{ paddingBottom: 24 }}>
      <View style={{ minHeight: 140 }}>
      <ScreenTitle style={{ marginBottom: 8 }}>{GUESS_TITLE}</ScreenTitle>
      <Text style={[theme.text.body, { color: theme.color.text.secondary }]}>{GUESS_HELP}</Text>
      </View>
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
