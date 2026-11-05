import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { ONBOARDING_STEPS } from '@/data/mock';
import { questionContentInset, questionNavHeight, useTheme } from '@/theme';
import { ForwardSlide, SUBTITLE_SLIDE_OFFSET } from './ForwardSlide';
import { Icon } from './Icon';
import { ProgressDots } from './ProgressDots';
import { ScreenTitle } from './ScreenTitle';

/** Back control, progress dots, title and subtitle. */
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
      <View style={styles.copy}>
        <ScreenTitle style={{ marginBottom: 8 }}>{title}</ScreenTitle>
        {slideSub ? (
          <ForwardSlide offset={SUBTITLE_SLIDE_OFFSET} delay={0}>
            {subtitle}
          </ForwardSlide>
        ) : (
          subtitle
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: questionNavHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: {
    width: questionNavHeight,
    height: questionNavHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { marginTop: questionContentInset },
});
