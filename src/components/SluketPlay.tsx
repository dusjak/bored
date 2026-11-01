import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLowPowerMode } from 'expo-battery';
import Animated, {
  interpolateColor,
  runOnJS,
  runOnUI,
  useAnimatedReaction,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import {
  Blur,
  Canvas,
  Circle,
  ColorMatrix,
  Group,
  Paint,
  Path,
  select,
  usePathValue,
  type Transforms3d,
} from '@shopify/react-native-skia';

import { PERIOD_ORIGIN, wordmarkBox, wordmarkSource } from '@/components/WordmarkImage';
import type { SplashProps } from '@/components/StillSplash';
import {
  createStimuli,
  GOO_MATRIX,
  gooSigma,
  REST_AT,
  sampleStimulus,
  SPLASH_MS,
  stimulusBudget,
  wobbleAmp,
  WORDMARK_W,
  wordmarkDraw,
  writeBlob,
  type Stimulus,
} from '@/splash/sluket';
import { useTheme } from '@/theme';

const MIX = [0, 1];
const GOO = [...GOO_MATRIX];

type PoseValue = {
  r: number;
  color: string;
  opacity: number;
};

/**
 * «Sluket». One Skia canvas for the goo layer and the hole.
 * The wordmark is the splash PNG, so the rest frame matches the native splash.
 * Loaded only when the splash decision is the full animation.
 */
export function SluketPlay({ onHandoff }: SplashProps) {
  const { theme } = useTheme();
  const { width, height } = useWindowDimensions();
  const batteryLow = useLowPowerMode();
  const [droppedLow, setDroppedLow] = useState(false);
  const low = batteryLow || droppedLow;
  const stimuli = useMemo(() => createStimuli(), []);
  const holeHex = theme.color.text.primary;
  const clock = useSharedValue(0);
  const sigma = useSharedValue(4);
  const degraded = useSharedValue(batteryLow ? 1 : 0);
  const dropped = useSharedValue(0);
  const reported = useSharedValue(batteryLow ? 1 : 0);
  const skipAt = useSharedValue(-1);
  const lastTs = useSharedValue(0);
  const ended = useSharedValue(0);
  const widthSv = useSharedValue(width);
  const heightSv = useSharedValue(height);
  const holeSv = useSharedValue(holeHex);
  const holeX = useSharedValue(width / 2);
  const holeY = useSharedValue(height / 2);
  const holeR = useSharedValue(0);
  const handed = useRef(false);
  const onHandoffRef = useRef(onHandoff);
  onHandoffRef.current = onHandoff;

  useEffect(() => {
    widthSv.value = width;
    heightSv.value = height;
  }, [height, heightSv, width, widthSv]);

  useEffect(() => {
    holeSv.value = holeHex;
  }, [holeHex, holeSv]);

  useEffect(() => {
    if (low) degraded.value = 1;
  }, [degraded, low]);

  const finish = useCallback((mode: 'enter' | 'fade') => {
    if (handed.current) return;
    handed.current = true;
    onHandoffRef.current(mode);
  }, []);

  // Stable identity. useFrameCallback restarts timeSinceFirstFrame when its callback changes.
  const onFrame = useCallback((frame: { timestamp: number; timeSincePreviousFrame: number | null; timeSinceFirstFrame: number }) => {
    'worklet';
    lastTs.value = frame.timestamp;
    let t = frame.timeSinceFirstFrame;
    if (skipAt.value >= 0) t = REST_AT + (frame.timestamp - skipAt.value);
    if (t > SPLASH_MS) t = SPLASH_MS;
    if (skipAt.value < 0 && t > 40 && t < 300) {
      const dt = frame.timeSincePreviousFrame;
      if (dt != null && dt > 32) dropped.value += 1;
    }
    const budget = stimulusBudget(degraded.value, dropped.value);
    if (budget[2] === 0) {
      degraded.value = 1;
      if (reported.value === 0) {
        reported.value = 1;
        runOnJS(setDroppedLow)(true);
      }
    }
    const draw = wordmarkDraw(t, widthSv.value, heightSv.value);
    holeX.value = draw.holeX;
    holeY.value = draw.holeY;
    holeR.value = draw.holeR;
    sigma.value = gooSigma(t, degraded.value === 1);
    clock.value = t;
    if (t >= SPLASH_MS && ended.value === 0) {
      ended.value = 1;
      runOnJS(finish)('enter');
    }
  }, [
    clock,
    degraded,
    dropped,
    ended,
    finish,
    heightSv,
    holeR,
    holeX,
    holeY,
    lastTs,
    reported,
    sigma,
    skipAt,
    widthSv,
  ]);

  useFrameCallback(onFrame);

  const skip = () => {
    runOnUI(() => {
      'worklet';
      if (ended.value === 1 || clock.value >= REST_AT) return;
      skipAt.value = lastTs.value;
    })();
  };

  const markStyle = useAnimatedStyle(() => {
    'worklet';
    const draw = wordmarkDraw(clock.value, widthSv.value, heightSv.value);
    return {
      opacity: draw.opacity,
      transform: [{ translateX: draw.translateX }, { translateY: draw.translateY }, { scale: draw.scale }],
    };
  });
  const clipStyle = useAnimatedStyle(() => {
    'worklet';
    const draw = wordmarkDraw(clock.value, widthSv.value, heightSv.value);
    return { left: draw.clipLeft, width: WORDMARK_W - draw.clipLeft };
  });
  const shiftStyle = useAnimatedStyle(() => {
    'worklet';
    const draw = wordmarkDraw(clock.value, widthSv.value, heightSv.value);
    return { marginLeft: -draw.clipLeft };
  });

  const source = wordmarkSource(theme.name);

  return (
    <View accessibilityViewIsModal style={[styles.layer, { backgroundColor: theme.color.bg.default }]}>
      <StatusBar style={theme.statusBar} />
      <Canvas style={styles.fill} pointerEvents="none">
        <Group
          layer={
            <Paint>
              <Blur blur={sigma} />
              <ColorMatrix matrix={GOO} />
            </Paint>
          }
        >
          {stimuli.map((stimulus, index) =>
            stimulus.morph ? (
              <MorphStimulus
                key={index}
                stimulus={stimulus}
                index={index}
                low={low}
                clock={clock}
                widthSv={widthSv}
                heightSv={heightSv}
                degraded={degraded}
                holeSv={holeSv}
              />
            ) : (
              <CircleStimulus
                key={index}
                stimulus={stimulus}
                index={index}
                clock={clock}
                widthSv={widthSv}
                heightSv={heightSv}
                degraded={degraded}
                holeSv={holeSv}
              />
            ),
          )}
        </Group>
        <Circle cx={holeX} cy={holeY} r={holeR} color={holeHex} />
      </Canvas>
      <Animated.View pointerEvents="none" style={[wordmarkBox, styles.slot, { transformOrigin: PERIOD_ORIGIN }, markStyle]}>
        <Animated.View style={[styles.clip, clipStyle]}>
          <Animated.View style={shiftStyle}>
            <Animated.Image source={source} style={styles.image} resizeMode="contain" />
          </Animated.View>
        </Animated.View>
      </Animated.View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="bored"
        accessibilityHint="Trykk for å hoppe over"
        onPress={skip}
        style={styles.fill}
      />
    </View>
  );
}

function useStimulusMotion(
  stimulus: Stimulus,
  index: number,
  clock: SharedValue<number>,
  widthSv: SharedValue<number>,
  heightSv: SharedValue<number>,
  degraded: SharedValue<number>,
  holeSv: SharedValue<string>,
) {
  const hex = stimulus.hex;
  const delay = stimulus.delay;
  const angle0 = stimulus.angle;
  const spin = stimulus.spin;
  const r0 = stimulus.r0;
  const size = stimulus.size;
  const flake = stimulus.flake;
  const pose = useSharedValue<PoseValue>({ r: 0, color: hex, opacity: 0 });
  const transform = useSharedValue<Transforms3d>([
    { translateX: 0 },
    { translateY: 0 },
    { rotate: 0 },
    { scaleX: 1 },
    { scaleY: 1 },
  ]);
  useAnimatedReaction(
    () => clock.value,
    () => {
      'worklet';
      const motion = sampleStimulus(
        index,
        delay,
        angle0,
        spin,
        r0,
        size,
        flake,
        clock.value,
        widthSv.value,
        heightSv.value,
        degraded.value,
      );
      pose.value = {
        r: motion[3],
        color: interpolateColor(motion[6], MIX, [hex, holeSv.value]),
        opacity: motion[0],
      };
      transform.value = [
        { translateX: motion[1] },
        { translateY: motion[2] },
        { rotate: motion[7] },
        { scaleX: motion[4] },
        { scaleY: motion[5] },
      ];
    },
  );
  return { pose, transform, delay, angle0, spin, r0, size, flake };
}

function CircleStimulus({
  stimulus,
  index,
  clock,
  widthSv,
  heightSv,
  degraded,
  holeSv,
}: {
  stimulus: Stimulus;
  index: number;
  clock: SharedValue<number>;
  widthSv: SharedValue<number>;
  heightSv: SharedValue<number>;
  degraded: SharedValue<number>;
  holeSv: SharedValue<string>;
}) {
  const { pose, transform } = useStimulusMotion(stimulus, index, clock, widthSv, heightSv, degraded, holeSv);
  return (
    <Group transform={transform} opacity={select(pose, 'opacity')}>
      <Circle cx={0} cy={0} r={select(pose, 'r')} color={select(pose, 'color')} />
    </Group>
  );
}

function MorphStimulus({
  stimulus,
  index,
  low,
  clock,
  widthSv,
  heightSv,
  degraded,
  holeSv,
}: {
  stimulus: Stimulus;
  index: number;
  low: boolean;
  clock: SharedValue<number>;
  widthSv: SharedValue<number>;
  heightSv: SharedValue<number>;
  degraded: SharedValue<number>;
  holeSv: SharedValue<string>;
}) {
  const kindId = stimulus.kindId;
  const phase = stimulus.phase;
  const { pose, transform, delay, angle0, spin, r0, size, flake } = useStimulusMotion(
    stimulus,
    index,
    clock,
    widthSv,
    heightSv,
    degraded,
    holeSv,
  );
  const path = usePathValue((builder) => {
    'worklet';
    const t = clock.value;
    const motion = sampleStimulus(
      index,
      delay,
      angle0,
      spin,
      r0,
      size,
      flake,
      t,
      widthSv.value,
      heightSv.value,
      degraded.value,
    );
    if (degraded.value === 1 || motion[0] === 0) {
      builder.addCircle(0, 0, 0);
      return;
    }
    writeBlob(builder, kindId, motion[1], motion[2], motion[3], wobbleAmp(t), t / 1000, phase, motion[4], motion[5], motion[7]);
  });
  if (low) {
    return (
      <Group transform={transform} opacity={select(pose, 'opacity')}>
        <Circle cx={0} cy={0} r={select(pose, 'r')} color={select(pose, 'color')} />
      </Group>
    );
  }
  return <Path path={path} color={select(pose, 'color')} />;
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 20 },
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  slot: { overflow: 'hidden' },
  clip: { position: 'absolute', top: 0, bottom: 0, overflow: 'hidden' },
  image: { width: WORDMARK_W, height: 80 },
});
