import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Button } from '@/components/Button';
import { OnboardingHeader } from '@/components/OnboardingHeader';
import { OptionCard } from '@/components/OptionCard';
import { Screen } from '@/components/Screen';
import { ScreenTitle } from '@/components/ScreenTitle';
import { QUESTIONS } from '@/data/mock';
import { confirmedMinutes, FORK_BODY, FORK_PREVIEW_LABEL, FORK_TITLE } from '@/onboarding/flow';
import { useAppState } from '@/state/AppState';
import { useTheme } from '@/theme';

/** Bridge after the practice. Skip goes to the name, then the summary. No reminder, no questions. */
export default function Veiskille() {
  const { theme } = useTheme();
  const { user, updateUser } = useAppState();
  const minutes = confirmedMinutes(user.duration);

  const tailor = () => {
    updateUser({ introPath: 'del2', duration: String(minutes), materialId: user.materialId ?? 'gummi' });
    router.push('/onboarding/distraction');
  };

  const skip = () => {
    updateUser({ introPath: 'skip', duration: String(minutes), materialId: user.materialId ?? 'gummi' });
    router.push({ pathname: '/onboarding/name', params: { after: 'ready' } });
  };

  return (
    <Screen top="none" contentStyle={styles.content}>
      <OnboardingHeader step={0} title="" sub="" />
      <ScreenTitle style={{ marginBottom: 8 }}>{FORK_TITLE}</ScreenTitle>
      <Text style={[theme.text.body, { color: theme.color.text.secondary }]}>{FORK_BODY}</Text>
      <QuestionPreview />
      <Button title="Tilpass øktene" onPress={tailor} />
      <Button title="Hopp over" variant="ghost" style={{ marginTop: 8 }} onPress={skip} />
    </Screen>
  );
}

/** First question, painted only. The cards dissolve into the page so the button stays clear. */
function QuestionPreview() {
  const { theme } = useTheme();
  const question = QUESTIONS.distraction;
  const [fadeWidth, setFadeWidth] = useState(0);
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${FORK_PREVIEW_LABEL}. ${question.title}`}
      style={styles.preview}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
      >
        <Text style={[theme.text.caption, { color: theme.color.text.tertiary, marginTop: 28, marginBottom: 8 }]}>
          {FORK_PREVIEW_LABEL}
        </Text>
        <ScreenTitle style={{ marginBottom: 16 }}>{question.title}</ScreenTitle>
        {question.options.map((option) => (
          <OptionCard key={option.id} label={option.label} sub={option.sub} selected={false} inert />
        ))}
      </View>
      <View
        pointerEvents="none"
        style={styles.fade}
        onLayout={(event) => setFadeWidth(event.nativeEvent.layout.width)}
      >
        <Svg width={fadeWidth} height={160}>
          <Defs>
            <LinearGradient id="fork-preview-fade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={theme.color.bg.default} stopOpacity={0} />
              <Stop offset="1" stopColor={theme.color.bg.default} stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Rect width={fadeWidth} height={160} fill="url(#fork-preview-fade)" />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  preview: { flex: 1, overflow: 'hidden', marginTop: 8 },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 160 },
});
