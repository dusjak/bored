import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  cancelAnimation,
  Easing,
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
  parseHex,
  periodScale,
  REDUCE_FADE_MS,
  rgbToHex,
  sampleStimulus,
  SPLASH_MS,
  wordReveal,
  type Stimulus,
} from '@/splash/sluket';
import { useTheme } from '@/theme';

const DOT = 10;
const WORD_SIZE = 52;

/**
 * DO NOT MOUNT. features.sluketAnimation is false, and SluketSplash must not import this file.
 *
 * BOR-26 diagnosis (fe61f09 still killed Expo Go, no JS redbox, the moment the coloured
 * stimuli appeared). Skia is gone, and `npx expo install --check` was clean
 * (reanimated 4.5.1, worklets 0.10.1), so this is the Reanimated UI runtime.
 * A React error boundary cannot catch it.
 *
 * Leading cause: each of the 60 StimulusView worklets returns a different style shape
 * across frames. While sampleStimulus is null the style is { opacity, transform: 3 ops }.
 * On the frame the pill appears it becomes { opacity, backgroundColor, transform: 5 ops }
 * with a fresh hex string. iOS aborts when a Reanimated view's transform length or colour
 * prop appears mid-flight. That matches the recording: beige field, then coloured pills,
 * then Expo Go is killed within a fraction of a second. No redbox, because the throw is
 * on the UI thread.
 *
 * Second cause, even if the style shape were stable: sampleStimulus is a worklet and calls
 * spiralAngle, which has no 'worklet' directive. That call starts at t = 600, after the
 * pills are already on screen. Calling a plain JS function from the UI thread is a native
 * abort in this runtime, not a catchable JS error.
 *
 * Also unsafe here: rgbToHex runs inside the worklet and assigns backgroundColor every frame.
 * parseHex itself runs on the JS thread (the hole colour is captured); it is not the call
 * that crashes. There is no useFrameCallback. The captured stimulus objects are small.
 */
export function SluketPlay({ fading, onHandoff, onDismiss }: SplashProps) {
  const { theme } = useTheme();
  const { width, height } = useWindowDimensions();
  const stimuli = useMemo(() => createStimuli(), []);
  const hole = useMemo(() => parseHex(theme.color.text.primary), [theme.color.text.primary]);
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
            hole={hole}
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

function stimulusBox(stimulus: Stimulus) {
  if (stimulus.kind === 'pill') return { width: 28, height: 10, radius: 5 };
  if (stimulus.kind === 'squircle') return { width: stimulus.size, height: stimulus.size, radius: 3 };
  return { width: stimulus.size, height: stimulus.size, radius: stimulus.size / 2 };
}

function StimulusView({
  stimulus,
  clock,
  width,
  height,
  hole,
}: {
  stimulus: Stimulus;
  clock: SharedValue<number>;
  width: number;
  height: number;
  hole: readonly [number, number, number];
}) {
  const box = stimulusBox(stimulus);
  const style = useAnimatedStyle(() => {
    const pose = sampleStimulus(stimulus, clock.value, width, height, hole);
    if (!pose) {
      return {
        opacity: 0,
        transform: [{ translateX: -1000 }, { translateY: -1000 }, { scale: 0 }],
      };
    }
    return {
      opacity: 1,
      backgroundColor: rgbToHex(pose.color),
      transform: [
        { translateX: pose.x },
        { translateY: pose.y },
        { rotate: `${pose.rotation}rad` },
        { scaleX: pose.scale * pose.stretch },
        { scaleY: pose.scale },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: -box.width / 2,
          top: -box.height / 2,
          width: box.width,
          height: box.height,
          borderRadius: box.radius,
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
