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
  total = ONBOARDING_STEPS,
  helpGap = 8,
  ink,
  subInk,
  dot,
  dotIdle,
}: {
  step: number;
  title: string;
  sub: string;
  /** Question steps only. The subtitle catches up after the push. */
  slideSub?: boolean;
  total?: number;
  /** Space between the title and the help line. The last Del 2 screen uses 4. */
  helpGap?: number;
  /** Title, help and back icon. The practice screen is on the session ground. */
  ink?: string;
  subInk?: string;
  dot?: string;
  dotIdle?: string;
}) {
  const { theme } = useTheme();
  const subtitle = sub ? (
    <Text style={[theme.text.caption, { color: subInk ?? theme.color.text.tertiary, marginBottom: 32 }]}>{sub}</Text>
  ) : null;
  return (
    <View>
      <View style={styles.bar}>
        <Pressable hitSlop={12} onPress={() => router.back()} accessibilityLabel="Tilbake" style={styles.back}>
          <Icon name="chevronLeft" size={18} color={subInk ?? theme.color.text.tertiary} />
        </Pressable>
        <ProgressDots total={total} current={step} activeColor={dot} idleColor={dotIdle} />
        <View style={styles.back} />
      </View>
      <View style={styles.copy}>
        {title ? <ScreenTitle color={ink} style={{ marginBottom: helpGap }}>{title}</ScreenTitle> : null}
        {subtitle && slideSub ? (
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
