import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Canvas, Circle, Group, RoundedRect } from '@shopify/react-native-skia';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  runOnUI,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import {
  createStimuli,
  HANDOVER_AT,
  HANDOVER_MS,
  parseHex,
  periodScale,
  REDUCE_FADE_MS,
  REDUCE_HOLD_MS,
  rgbToHex,
  sampleStimulus,
  SPLASH_MS,
  wordReveal,
  type Stimulus,
} from '@/splash/sluket';
import { useTheme } from '@/theme';

const DOT = 10;
const WORD_SIZE = 52;

type Handoff = 'enter' | 'fade';

type Props = {
  /** Parent has asked the overlay to crossfade out. */
  fading: boolean;
  onHandoff: (mode: Handoff) => void;
  onDismiss: () => void;
};

/**
 * «Sluket». Noise spirals into the period, then «bored» comes out of it.
 * Atlas can't stretch one axis, so each stimulus is its own transformed shape.
 */
export function SluketSplash({ fading, onHandoff, onDismiss }: Props) {
  const { theme } = useTheme();
  const reduceMotion = useReducedMotion();
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

  const finish = useCallback((mode: Handoff) => {
    if (handed.current) return;
    handed.current = true;
    onHandoffRef.current(mode);
  }, []);

  const dismiss = useCallback(() => {
    onDismissRef.current();
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      const timer = setTimeout(() => finish('fade'), REDUCE_HOLD_MS);
      return () => clearTimeout(timer);
    }
    ended.value = 0;
    clock.value = withTiming(SPLASH_MS, { duration: SPLASH_MS, easing: Easing.linear }, (done) => {
      if (done && ended.value === 0) {
        ended.value = 1;
        runOnJS(finish)('enter');
      }
    });
    return () => cancelAnimation(clock);
  }, [clock, ended, finish, reduceMotion]);

  useEffect(() => {
    if (!fading) return;
    opacity.value = withTiming(0, { duration: REDUCE_FADE_MS }, (done) => {
      if (done) runOnJS(dismiss)();
    });
    return () => cancelAnimation(opacity);
  }, [dismiss, fading, opacity]);

  const skip = () => {
    if (reduceMotion) {
      finish('fade');
      return;
    }
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
      {reduceMotion ? null : (
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          {stimuli.map((stimulus, index) => (
            <Stimulus key={index} stimulus={stimulus} clock={clock} width={width} height={height} hole={hole} />
          ))}
        </Canvas>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="bored"
        accessibilityHint="Trykk for å hoppe over"
        onPress={skip}
        style={styles.press}
      >
        {reduceMotion ? (
          <Text
            style={{
              fontFamily: theme.fonts.serifItalic,
              fontSize: WORD_SIZE,
              color: theme.color.text.primary,
            }}
          >
            bored.
          </Text>
        ) : (
          <Wordmark clock={clock} color={theme.color.text.primary} fontFamily={theme.fonts.serifItalic} />
        )}
      </Pressable>
    </Animated.View>
  );
}

function Stimulus({
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
  const transform = useDerivedValue(() => {
    const pose = sampleStimulus(stimulus, clock.value, width, height, hole);
    if (!pose) return [{ translateX: -200 }, { translateY: -200 }, { scale: 0 }];
    return [
      { translateX: pose.x },
      { translateY: pose.y },
      { rotate: pose.rotation },
      { scaleX: pose.scale * pose.stretch },
      { scaleY: pose.scale },
    ];
  });
  const color = useDerivedValue(() => {
    const pose = sampleStimulus(stimulus, clock.value, width, height, hole);
    return rgbToHex(pose ? pose.color : stimulus.color);
  });

  if (stimulus.kind === 'badge') {
    return (
      <Group transform={transform}>
        <Circle cx={0} cy={0} r={stimulus.size / 2} color={color} />
      </Group>
    );
  }
  if (stimulus.kind === 'pill') {
    return (
      <Group transform={transform}>
        <RoundedRect x={-14} y={-5} width={28} height={10} r={5} color={color} />
      </Group>
    );
  }
  return (
    <Group transform={transform}>
      <RoundedRect x={-7} y={-7} width={14} height={14} r={3} color={color} />
    </Group>
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
  press: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  wordSlot: { height: WORD_SIZE + 8, alignItems: 'center', justifyContent: 'center' },
  measure: { position: 'absolute', opacity: 0 },
  mask: { position: 'absolute', right: DOT, top: 0, bottom: 0, overflow: 'hidden' },
  letters: { position: 'absolute', right: 0, top: 0 },
  dot: { position: 'absolute', right: 0, top: (WORD_SIZE + 8 - DOT) / 2, width: DOT, height: DOT, borderRadius: DOT / 2 },
});
