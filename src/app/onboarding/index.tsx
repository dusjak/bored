import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View, type TextLayoutEvent } from 'react-native';
import { router } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
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
/** Design rhythm is 72/70. The line box is taller so the serifs are not cut, then lifted so the baselines stay 70 apart. */
const LINE = 70;
const BOX = 96;
const LIFT = BOX - LINE;
const PERIOD_HEIGHT = PERIOD * (KLUMPEN_BOUNDS.height / KLUMPEN_BOUNDS.width);

const WELCOME_BODY =
  'Hjernen din trenger pauser fra stimuli. Ikke meditasjon. Ikke pusteteknikker. Bare litt kjedsomhet, bevisst og regelmessig.';

/** First screen. The period is the lump mark. The top of the screen stays empty. */
export default function MeetKlumpen() {
  const { theme } = useTheme();
  const reduceMotion = useOsReduceMotion();
  const { replayIntroSplash } = useAppState();
  const replay = isSplashReplayEnabled(isDevBuild(), easBuildProfile());
  const ink = theme.color.text.primary;
  const [stop, setStop] = useState<{ left: number; top: number } | null>(null);

  return (
    <Screen top="app" contentStyle={styles.content}>
      <View style={styles.spacer} />
      <Pressable
        accessibilityRole="header"
        accessibilityLabel="Ingenting er målet."
        delayLongPress={SPLASH_REPLAY_HOLD_MS}
        onLongPress={replay ? () => replayIntroSplash() : undefined}
      >
        <Rise delay={0} duration={600} distance={12} reduceMotion={reduceMotion}>
          <HeroLine color={ink} fontFamily={theme.fonts.serif}>Ingenting</HeroLine>
        </Rise>
        <View style={styles.line}>
          <Rise delay={300} duration={600} distance={12} reduceMotion={reduceMotion}>
            <HeroLine
              color={ink}
              fontFamily={theme.fonts.serif}
              onTextLayout={(event) => {
                const lines = event.nativeEvent.lines;
                const last = lines[lines.length - 1];
                if (!last) return;
                const ascender = last.ascender > 0 ? last.ascender : last.height * 0.8;
                setStop({
                  left: last.x + last.width + 2,
                  top: -LIFT + last.y + ascender - PERIOD_HEIGHT,
                });
              }}
            >
              er målet
            </HeroLine>
          </Rise>
          {stop ? <PeriodMark color={ink} reduceMotion={reduceMotion} left={stop.left} top={stop.top} /> : null}
        </View>
      </Pressable>
      <Rise delay={1700} duration={500} distance={8} reduceMotion={reduceMotion}>
        <Text style={[theme.text.body, styles.ingress, { color: theme.color.text.secondary }]}>{WELCOME_BODY}</Text>
      </Rise>
      <Rise delay={2000} duration={450} distance={8} reduceMotion={reduceMotion}>
        <Button title="Kom i gang" onPress={() => router.push('/onboarding/kjedomhet')} />
      </Rise>
    </Screen>
  );
}

/** OS setting only. Reanimated's hook is captured once at import and can stay stuck. */
function useOsReduceMotion() {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => {
        if (live) setReduceMotion(on);
      })
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  return reduceMotion;
}

function HeroLine({
  color,
  fontFamily,
  onTextLayout,
  children,
}: {
  color: string;
  fontFamily: string;
  onTextLayout?: (event: TextLayoutEvent) => void;
  children: string;
}) {
  return (
    <View style={styles.heroSlot}>
      <Text
        onTextLayout={onTextLayout}
        style={[styles.hero, { color, fontFamily }]}
      >
        {children}
      </Text>
    </View>
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
  const y = useSharedValue(distance);
  const opacity = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) {
      y.value = 0;
      opacity.value = 1;
      return;
    }
    y.value = distance;
    opacity.value = 0;
    y.value = withDelay(delay, withTiming(0, { duration, easing: EASE_IN }));
    opacity.value = withDelay(delay, withTiming(1, { duration, easing: EASE_IN }));
  }, [delay, distance, duration, opacity, reduceMotion, y]);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/** Lump mark used as the period. It drops 30 pt, squashes, then springs back. */
function PeriodMark({
  color,
  reduceMotion,
  left,
  top,
}: {
  color: string;
  reduceMotion: boolean;
  left: number;
  top: number;
}) {
  const y = useSharedValue(-PERIOD_DROP);
  const scaleX = useSharedValue(1);
  const scaleY = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) {
      y.value = 0;
      scaleX.value = 1;
      scaleY.value = 1;
      return;
    }
    y.value = -PERIOD_DROP;
    scaleX.value = 1;
    scaleY.value = 1;
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
  return (
    <Animated.View style={[styles.period, { left, top }, style]}>
      <Svg width={PERIOD} height={PERIOD_HEIGHT} viewBox={`${KLUMPEN_BOUNDS.x} ${KLUMPEN_BOUNDS.y} ${KLUMPEN_BOUNDS.width} ${KLUMPEN_BOUNDS.height}`}>
        <Path d={KLUMPEN_PATH} fill={color} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 24, justifyContent: 'flex-end', overflow: 'visible' },
  spacer: { flex: 1 },
  heroSlot: { height: LINE, overflow: 'visible' },
  hero: { fontSize: 72, lineHeight: BOX, letterSpacing: -1.44, marginTop: -LIFT },
  line: { overflow: 'visible' },
  period: { position: 'absolute' },
  ingress: { marginTop: 16, marginBottom: 24 },
});
