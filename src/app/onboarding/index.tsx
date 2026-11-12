import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { KLUMPEN_PATH } from '@/components/klumpenPath';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { KLUMPEN_BOUNDS } from '@/duration/klumpen';
import { easBuildProfile, isDevBuild } from '@/config/buildProfile';
import { isSplashReplayEnabled } from '@/config/features';
import { useAppState } from '@/state/AppState';
import { useTheme } from '@/theme';

/** Hidden replay. Dev and TestFlight only. A production profile, or a missing profile, stays off. */
export const SPLASH_REPLAY_HOLD_MS = 2000;

const EASE_IN = Easing.bezier(0.2, 0, 0, 1);
const PERIOD = 19;
const PERIOD_DROP = 30;

const WELCOME_BODY =
  'Hjernen din trenger pauser fra stimuli. Ikke meditasjon. Ikke pusteteknikker. Bare litt kjedsomhet, bevisst og regelmessig.';

/** First screen. The period is the lump mark. The top of the screen stays empty. */
export default function MeetKlumpen() {
  const { theme } = useTheme();
  const reduceMotion = useReducedMotion();
  const { replayIntroSplash } = useAppState();
  const replay = isSplashReplayEnabled(isDevBuild(), easBuildProfile());

  return (
    <Screen top="app" contentStyle={styles.content}>
      <View style={styles.spacer} />
      <Pressable
        accessibilityRole="header"
        accessibilityLabel="Ingenting er målet."
        delayLongPress={SPLASH_REPLAY_HOLD_MS}
        onLongPress={replay ? () => replayIntroSplash() : undefined}
      >
        <Rise delay={0} duration={600} distance={12} reduceMotion={reduceMotion === true}>
          <Text style={[styles.hero, { color: theme.color.text.primary, fontFamily: theme.fonts.serif }]}>Ingenting</Text>
        </Rise>
        <View style={styles.line}>
          <Rise delay={300} duration={600} distance={12} reduceMotion={reduceMotion === true}>
            <Text style={[styles.hero, { color: theme.color.text.primary, fontFamily: theme.fonts.serif }]}>er målet</Text>
          </Rise>
          <PeriodMark reduceMotion={reduceMotion === true} />
        </View>
      </Pressable>
      <Rise delay={1700} duration={500} distance={8} reduceMotion={reduceMotion === true}>
        <Text style={[theme.text.body, styles.ingress, { color: theme.color.text.secondary }]}>{WELCOME_BODY}</Text>
      </Rise>
      <Rise delay={2000} duration={450} distance={8} reduceMotion={reduceMotion === true}>
        <Button title="Kom i gang" onPress={() => router.push('/onboarding/kjedomhet')} />
      </Rise>
    </Screen>
  );
}

function Rise({
  delay,
  duration,
  distance,
  reduceMotion,
  children,
}: {
  delay: number;
  duration: number;
  distance: number;
  reduceMotion: boolean;
  children: ReactNode;
}) {
  const y = useSharedValue(reduceMotion ? 0 : distance);
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) return;
    y.value = withDelay(delay, withTiming(0, { duration, easing: EASE_IN }));
    opacity.value = withDelay(delay, withTiming(1, { duration, easing: EASE_IN }));
  }, [delay, duration, opacity, reduceMotion, y]);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/** Lump mark used as the period. It drops 30 pt, squashes, then springs back. */
function PeriodMark({ reduceMotion }: { reduceMotion: boolean }) {
  const y = useSharedValue(reduceMotion ? 0 : -PERIOD_DROP);
  const scaleX = useSharedValue(1);
  const scaleY = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) return;
    y.value = withDelay(
      1000,
      withTiming(0, { duration: 320, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (!finished) return;
        scaleX.value = 1.22;
        scaleY.value = 0.76;
        scaleX.value = withSpring(1, { stiffness: 310, damping: 14, mass: 1 });
        scaleY.value = withSpring(1, { stiffness: 310, damping: 14, mass: 1 });
      }),
    );
  }, [reduceMotion, scaleX, scaleY, y]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { scaleX: scaleX.value }, { scaleY: scaleY.value }],
  }));
  const height = PERIOD * (KLUMPEN_BOUNDS.height / KLUMPEN_BOUNDS.width);
  return (
    <Animated.View style={[styles.period, style]}>
      <Svg width={PERIOD} height={height} viewBox={`${KLUMPEN_BOUNDS.x} ${KLUMPEN_BOUNDS.y} ${KLUMPEN_BOUNDS.width} ${KLUMPEN_BOUNDS.height}`}>
        <Path d={KLUMPEN_PATH} fill="#F8F6F2" />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 24, justifyContent: 'flex-end' },
  spacer: { flex: 1 },
  hero: { fontSize: 72, lineHeight: 70, letterSpacing: -1.44 },
  line: { flexDirection: 'row', alignItems: 'flex-end' },
  period: { marginLeft: 4, marginBottom: 10 },
  ingress: { marginTop: 16, marginBottom: 24 },
});
