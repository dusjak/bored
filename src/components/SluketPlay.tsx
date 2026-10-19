import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  cancelAnimation,
  Easing,
  interpolateColor,
  runOnJS,
  runOnUI,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import type { SplashProps } from '@/components/StillSplash';
import {
  createStimuli,
  HANDOVER_AT,
  HANDOVER_MS,
  periodScale,
  REDUCE_FADE_MS,
  sampleMotion,
  SPLASH_MS,
  wordReveal,
  type Stimulus,
} from '@/splash/sluket';
import { useTheme } from '@/theme';

const DOT = 10;
const WORD_SIZE = 52;
const MIX_STOPS = [0, 1];

/**
 * «Sluket» spiral. Loaded only when features.sluketAnimation is true.
 * Every stimulus frame returns the same style shape:
 * { opacity, backgroundColor, transform: [translateX, translateY, rotate, scaleX, scaleY] }.
 * Colour moves with interpolateColor between two strings captured on the JS thread.
 */
export function SluketPlay({ fading, onHandoff, onDismiss }: SplashProps) {
  const { theme } = useTheme();
  const { width, height } = useWindowDimensions();
  const stimuli = useMemo(() => createStimuli(), []);
  const holeHex = theme.color.text.primary;
  const clock = useSharedValue(0);
  const opacity = useSharedValue(1);
  const ended = useSharedValue(0);
  const handed = useRef(false);
  const onHandoffRef = useRef(onHandoff);
  const onDismissRef = useRef(onDismiss);
  onHandoffRef.current = onHandoff;
  onDismissRef.current = onDismiss;

  const finish = useCallback((mode: 'enter' | 'fade') => {
    if (handed.current) return;
    handed.current = true;
    onHandoffRef.current(mode);
  }, []);

  const dismiss = useCallback(() => {
    onDismissRef.current();
  }, []);

  useEffect(() => {
    ended.value = 0;
    clock.value = withTiming(SPLASH_MS, { duration: SPLASH_MS, easing: Easing.linear }, (done) => {
      if (done && ended.value === 0) {
        ended.value = 1;
        runOnJS(finish)('enter');
      }
    });
    return () => cancelAnimation(clock);
  }, [clock, ended, finish]);

  useEffect(() => {
    if (!fading) return;
    opacity.value = withTiming(0, { duration: REDUCE_FADE_MS }, (done) => {
      if (done) runOnJS(dismiss)();
    });
    return () => cancelAnimation(opacity);
  }, [dismiss, fading, opacity]);

  const skip = () => {
    runOnUI(() => {
      'worklet';
      if (ended.value === 1 || clock.value >= HANDOVER_AT) return;
      ended.value = 1;
      cancelAnimation(clock);
      clock.value = HANDOVER_AT;
      clock.value = withTiming(SPLASH_MS, { duration: HANDOVER_MS, easing: Easing.in(Easing.cubic) }, (done) => {
        if (done) runOnJS(finish)('enter');
      });
    })();
  };

  const veil = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      accessibilityViewIsModal
      style={[styles.layer, veil, { backgroundColor: theme.color.bg.default }]}
    >
      <StatusBar style={theme.statusBar} />
      <View style={styles.field} pointerEvents="none">
        {stimuli.map((stimulus, index) => (
          <StimulusView
            key={index}
            stimulus={stimulus}
            clock={clock}
            width={width}
            height={height}
            holeHex={holeHex}
          />
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="bored"
        accessibilityHint="Trykk for å hoppe over"
        onPress={skip}
        style={styles.press}
      >
        <Wordmark clock={clock} color={theme.color.text.primary} fontFamily={theme.fonts.serifItalic} />
      </Pressable>
    </Animated.View>
  );
}

function StimulusView({
  stimulus,
  clock,
  width,
  height,
  holeHex,
}: {
  stimulus: Stimulus;
  clock: SharedValue<number>;
  width: number;
  height: number;
  holeHex: string;
}) {
  const delay = stimulus.delay;
  const angle0 = stimulus.angle;
  const spin = stimulus.spin;
  const drift = stimulus.drift;
  const spiral = stimulus.spiral;
  const r0 = stimulus.r0;
  const r1 = stimulus.r1;
  const hex = stimulus.hex;
  const colors = useMemo(() => [hex, holeHex], [hex, holeHex]);
  const style = useAnimatedStyle(() => {
    const motion = sampleMotion(delay, angle0, spin, drift, spiral, r0, r1, clock.value, width, height);
    return {
      opacity: motion[0],
      backgroundColor: interpolateColor(motion[6], MIX_STOPS, colors),
      transform: [
        { translateX: motion[1] },
        { translateY: motion[2] },
        { rotate: `${motion[3]}rad` },
        { scaleX: motion[4] * motion[5] },
        { scaleY: motion[4] },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: -stimulus.boxWidth / 2,
          top: -stimulus.boxHeight / 2,
          width: stimulus.boxWidth,
          height: stimulus.boxHeight,
          borderRadius: stimulus.boxRadius,
        },
        style,
      ]}
    />
  );
}

function Wordmark({ clock, color, fontFamily }: { clock: SharedValue<number>; color: string; fontFamily: string }) {
  const [boredWidth, setBoredWidth] = useState(0);
  const shift = boredWidth / 2;
  const group = useAnimatedStyle(() => ({
    transform: [{ translateX: (1 - wordReveal(clock.value)) * -shift }],
  }));
  const mask = useAnimatedStyle(() => ({
    width: wordReveal(clock.value) * boredWidth,
  }));
  const dot = useAnimatedStyle(() => ({
    transform: [{ scale: periodScale(clock.value) }],
  }));
  const text = { fontFamily, fontSize: WORD_SIZE, color, lineHeight: WORD_SIZE + 8 };

  return (
    <View style={styles.wordSlot} importantForAccessibility="no-hide-descendants">
      <Text
        accessible={false}
        style={[text, styles.measure]}
        onLayout={(event) => setBoredWidth(event.nativeEvent.layout.width)}
      >
        bored
      </Text>
      <Animated.View style={[{ width: boredWidth + DOT, height: WORD_SIZE + 8 }, group]}>
        <Animated.View style={[styles.mask, mask]}>
          <Text style={[text, styles.letters, { width: boredWidth }]}>bored</Text>
        </Animated.View>
        <Animated.View style={[styles.dot, dot, { backgroundColor: color }]} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 20 },
  field: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden' },
  press: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  wordSlot: { height: WORD_SIZE + 8, alignItems: 'center', justifyContent: 'center' },
  measure: { position: 'absolute', opacity: 0 },
  mask: { position: 'absolute', right: DOT, top: 0, bottom: 0, overflow: 'hidden' },
  letters: { position: 'absolute', right: 0, top: 0 },
  dot: {
    position: 'absolute',
    right: 0,
    top: (WORD_SIZE + 8 - DOT) / 2,
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
  },
});
