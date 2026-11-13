import { useCallback, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, usePathname } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { knappetrykk } from '@/analytics/track';
import { onboardingStepName } from '@/analytics/screens';
import { backStep, stepDirection } from '@/onboarding/stepMotion';

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
  /** Part 2 keeps the dots. Part 1 turns them off. */
  dots = true,
  /** Question ingress is body 16/24, 8 pt under the title, with no 32 pt tail. */
  bodySub = false,
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
  dots?: boolean;
  bodySub?: boolean;
  /** Title, help and back icon. The practice screen is on the session ground. */
  ink?: string;
  subInk?: string;
  dot?: string;
  dotIdle?: string;
}) {
  const { theme } = useTheme();
  const pathname = usePathname();
  const subtitle = sub ? (
    <Text
      style={[
        bodySub ? theme.text.body : theme.text.caption,
        { color: subInk ?? (bodySub ? theme.color.text.secondary : theme.color.text.tertiary), marginBottom: bodySub ? 0 : 32 },
      ]}
    >
      {sub}
    </Text>
  ) : null;
  return (
    <View>
      <View style={styles.bar}>
        <Pressable
          hitSlop={12}
          onPress={() => {
            knappetrykk({
              type: 'Stegnavigasjon',
              navn: 'Tilbake',
              hendelse: 'trykk',
              skjerm: onboardingStepName(pathname) ?? pathname,
            });
            backStep();
          }}
          accessibilityLabel="Tilbake"
          style={styles.back}
        >
          <Icon name="chevronLeft" size={18} color={subInk ?? theme.color.text.tertiary} />
        </Pressable>
        {dots ? <ProgressDots total={total} current={step} activeColor={dot} idleColor={dotIdle} /> : <View style={styles.spacer} />}
        <View style={styles.back} />
      </View>
      <View style={styles.copy}>
        {bodySub ? (
          <CopyRise>
            {title ? <ScreenTitle color={ink} style={{ marginBottom: helpGap }}>{title}</ScreenTitle> : null}
            {subtitle}
          </CopyRise>
        ) : (
          <>
            {title ? <ScreenTitle color={ink} style={{ marginBottom: helpGap }}>{title}</ScreenTitle> : null}
            {subtitle && slideSub ? (
              <ForwardSlide offset={SUBTITLE_SLIDE_OFFSET} delay={0}>
                {subtitle}
              </ForwardSlide>
            ) : (
              subtitle
            )}
          </>
        )}
      </View>
    </View>
  );
}

const COPY_EASE = Easing.bezier(0.2, 0, 0, 1);
const COPY_DELAY = 120;
const COPY_MS = 320;

function CopyRise({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion() === true;
  const back = stepDirection() === 'back';
  const y = useSharedValue(reduceMotion ? 0 : back ? -8 : 8);
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  useFocusEffect(
    useCallback(() => {
      if (reduceMotion) {
        y.value = 0;
        opacity.value = 1;
        return;
      }
      const from = stepDirection() === 'back' ? -8 : 8;
      y.value = from;
      opacity.value = 0;
      y.value = withDelay(COPY_DELAY, withTiming(0, { duration: COPY_MS, easing: COPY_EASE }));
      opacity.value = withDelay(COPY_DELAY, withTiming(1, { duration: COPY_MS, easing: COPY_EASE }));
      return () => {
        if (stepDirection() !== 'back') return;
        y.value = withTiming(8, { duration: COPY_MS, easing: COPY_EASE });
        opacity.value = withTiming(0, { duration: COPY_MS, easing: COPY_EASE });
      };
    }, [opacity, reduceMotion, y]),
  );
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
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
  spacer: { flex: 1 },
  copy: { marginTop: questionContentInset },
});
