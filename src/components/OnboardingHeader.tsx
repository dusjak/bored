import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { ONBOARDING_STEPS } from '@/data/mock';
import { tabularNums, useTheme } from '@/theme';
import { ForwardSlide, SUBTITLE_SLIDE_OFFSET } from './ForwardSlide';
import { Icon } from './Icon';
import { ProgressDots } from './ProgressDots';
import { ScreenTitle } from './ScreenTitle';

/** Back control, progress, step count, title and subtitle. */
export function OnboardingHeader({
  step,
  title,
  sub,
  slideSub = false,
}: {
  step: number;
  title: string;
  sub: string;
  /** Question steps only. The subtitle catches up after the push. */
  slideSub?: boolean;
}) {
  const { theme } = useTheme();
  const subtitle = (
    <Text style={[theme.text.caption, { color: theme.color.text.tertiary, marginBottom: 32 }]}>{sub}</Text>
  );
  return (
    <View>
      <View style={styles.bar}>
        <Pressable hitSlop={12} onPress={() => router.back()} accessibilityLabel="Tilbake" style={styles.back}>
          <Icon name="chevronLeft" size={18} color={theme.color.text.tertiary} />
        </Pressable>
        <ProgressDots total={ONBOARDING_STEPS} current={step} />
        <View style={styles.back} />
      </View>
      <Text style={[theme.text.eyebrow, { fontVariant: tabularNums, color: theme.color.text.tertiary, marginBottom: 10 }]}>
        {step + 1} av {ONBOARDING_STEPS}
      </Text>
      <ScreenTitle style={{ marginBottom: 8 }}>{title}</ScreenTitle>
      {slideSub ? (
        <ForwardSlide offset={SUBTITLE_SLIDE_OFFSET} delay={0}>
          {subtitle}
        </ForwardSlide>
      ) : (
        subtitle
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 32,
  },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
