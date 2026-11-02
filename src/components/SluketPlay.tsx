import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLowPowerMode } from 'expo-battery';
import Animated, {
  interpolateColor,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import {
  Circle,
  Group,
  LinearGradient,
  Paint,
  Path,
  Rect,
  RuntimeShader,
  Blur,
  ColorMatrix,
  Canvas,
  Skia,
  select,
  usePathValue,
  vec,
  type Transforms3d,
} from '@shopify/react-native-skia';

import { WordmarkImage } from '@/components/WordmarkImage';
import type { SplashProps } from '@/components/StillSplash';
import { features } from '@/config/features';
import { sluketMixEffect } from '@/splash/sluketMix';
import {
  colorMixEnabled,
  createStimuli,
  DOT_CX,
  DOT_CY,
  gooSigma,
  legacyTime,
  markPose,
  massIn,
  mixAt,
  sampleStimulus,
  SOFT_PT,
  SPLASH_BG,
  SPLASH_INK,
  SPLASH_MS,
  wobbleAtLegacy,
  writeOutline,
  type Stimulus,
} from '@/splash/sluket';
import { DOT_D, WORD_D } from '@/splash/wordmarkPaths';

const GOO = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 18, -7];
const MIX_STOPS = [0, 1];

type PoseValue = { color: string; opacity: number };

/**
 * «Sluket» v4. Always #111110 / #F8F6F2. No theme read.
 * Shapes become the dot; the dot glides; «bored» reveals from the right.
 * The paint mix is one shader, skipped when the flag is off or Low Power Mode is on.
 */
export function SluketPlay({ onHandoff }: SplashProps) {
  const { width, height } = useWindowDimensions();
  const batteryLow = useLowPowerMode();
  const lowPower = useSharedValue(batteryLow ? 1 : 0);
  const mixOn = colorMixEnabled(features.sluketColorMix, batteryLow) && sluketMixEffect != null;
  const stimuli = useMemo(() => createStimuli(), []);
  const wordPath = useMemo(() => Skia.Path.MakeFromSVGString(WORD_D), []);
  const dotPath = useMemo(() => Skia.Path.MakeFromSVGString(DOT_D), []);
  const clock = useSharedValue(0);
  const sigma = useSharedValue(2);
  const mixM = useSharedValue(0.85);
  const mixR = useSharedValue(13);
  const mass = useSharedValue(0);
  const widthSv = useSharedValue(width);
  const heightSv = useSharedValue(height);
  const ended = useSharedValue(0);
  const handed = useRef(false);
  const onHandoffRef = useRef(onHandoff);
  onHandoffRef.current = onHandoff;

  useEffect(() => {
    widthSv.value = width;
    heightSv.value = height;
    lowPower.value = batteryLow ? 1 : 0;
  }, [batteryLow, height, heightSv, lowPower, width, widthSv]);

  const finish = useCallback((mode: 'enter' | 'fade') => {
    if (handed.current) return;
    handed.current = true;
    onHandoffRef.current(mode);
  }, []);

  const onFrame = useCallback(
    (frame: { timestamp: number; timeSincePreviousFrame: number | null; timeSinceFirstFrame: number }) => {
      'worklet';
      let t = frame.timeSinceFirstFrame;
      if (t > SPLASH_MS) t = SPLASH_MS;
      const legacy = legacyTime(t);
      mass.value = massIn(stimuli, legacy, widthSv.value, heightSv.value, lowPower.value);
      const mix = mixAt(t);
      mixM.value = mix.m;
      mixR.value = mix.radius;
      sigma.value = gooSigma(legacy);
      clock.value = t;
      if (t >= SPLASH_MS && ended.value === 0) {
        ended.value = 1;
        runOnJS(finish)('enter');
      }
    },
    [clock, ended, finish, heightSv, lowPower, mass, mixM, mixR, sigma, stimuli, widthSv],
  );
  useFrameCallback(onFrame);

  const skip = () => {
    if (ended.value === 1) return;
    ended.value = 1;
    finish('enter');
  };

  const uniforms = useDerivedValue(() => ({
    m: lowPower.value === 1 || !features.sluketColorMix ? 0 : mixM.value,
    radius: mixR.value,
    sigma: sigma.value,
  }));
  const pngStyle = useAnimatedStyle(() => {
    'worklet';
    const pose = markPose(clock.value, mass.value);
    return { opacity: pose.showPng ? 1 : 0 };
  });
  const wordOpacity = useDerivedValue(() => (markPose(clock.value, mass.value).showPng ? 0 : 1));
  const clip = useDerivedValue(() => {
    const pose = markPose(clock.value, mass.value);
    return {
      x: pose.clipLeft,
      y: -80,
      width: Math.max(0, pose.clipRight - pose.clipLeft),
      height: 160,
    };
  });
  const fadeStart = useDerivedValue(() => vec(markPose(clock.value, mass.value).front, -60));
  const fadeEnd = useDerivedValue(() => vec(markPose(clock.value, mass.value).front + SOFT_PT, -60));
  const fadeX = useDerivedValue(() => markPose(clock.value, mass.value).front);
  const circleCx = useDerivedValue(() => widthSv.value / 2 + markPose(clock.value, mass.value).dx);
  const circleCy = useDerivedValue(() => heightSv.value / 2 + markPose(clock.value, mass.value).dy);
  const circleR = useDerivedValue(() => {
    const pose = markPose(clock.value, mass.value);
    return pose.showCircle ? pose.circleR : 0;
  });
  const glyphOpacity = useDerivedValue(() => markPose(clock.value, mass.value).glyphA);
  const glyphTransform = useDerivedValue<Transforms3d>(() => {
    const pose = markPose(clock.value, mass.value);
    return [
      { translateX: widthSv.value / 2 + pose.dx },
      { translateY: heightSv.value / 2 + pose.dy },
      { scale: pose.glyphS },
      { translateX: -DOT_CX },
      { translateY: -DOT_CY },
    ];
  });

  const blobs = stimuli.map((stimulus, index) => (
    <BlobView
      key={index}
      stimulus={stimulus}
      index={index}
      clock={clock}
      widthSv={widthSv}
      heightSv={heightSv}
      lowPower={lowPower}
    />
  ));

  return (
    <View accessibilityViewIsModal style={[styles.layer, { backgroundColor: SPLASH_BG }]}>
      <StatusBar style="light" />
      <Canvas style={styles.fill} pointerEvents="none">
        <Rect x={0} y={0} width={width} height={height} color={SPLASH_BG} />
        {mixOn && sluketMixEffect ? (
          <Group layer={<Paint><RuntimeShader source={sluketMixEffect} uniforms={uniforms} /></Paint>}>
            {blobs}
          </Group>
        ) : (
          <Group layer={<Paint><Blur blur={sigma} /><ColorMatrix matrix={GOO} /></Paint>}>
            {blobs}
          </Group>
        )}
        <Group transform={[{ translateX: width / 2 }, { translateY: height / 2 }]} clip={clip} opacity={wordOpacity}>
          {wordPath ? <Path path={wordPath} color={SPLASH_INK} /> : null}
          <Rect x={fadeX} y={-60} width={SOFT_PT} height={120}>
            <LinearGradient start={fadeStart} end={fadeEnd} colors={[SPLASH_BG, 'rgba(17,17,16,0)']} />
          </Rect>
        </Group>
        <Circle cx={circleCx} cy={circleCy} r={circleR} color={SPLASH_INK} />
        {dotPath ? (
          <Group transform={glyphTransform} opacity={glyphOpacity}>
            <Path path={dotPath} color={SPLASH_INK} />
          </Group>
        ) : null}
      </Canvas>
      <Animated.View pointerEvents="none" style={[styles.fill, pngStyle]}>
        <WordmarkImage />
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

function BlobView({
  stimulus,
  index,
  clock,
  widthSv,
  heightSv,
  lowPower,
}: {
  stimulus: Stimulus;
  index: number;
  clock: SharedValue<number>;
  widthSv: SharedValue<number>;
  heightSv: SharedValue<number>;
  lowPower: SharedValue<number>;
}) {
  const hex = stimulus.hex;
  const delay = stimulus.delay;
  const angle = stimulus.angle;
  const r0 = stimulus.r0;
  const size = stimulus.size;
  const phase = stimulus.phase;
  const rot0 = stimulus.rot0;
  const flake = stimulus.flake;
  const turnU = stimulus.turnU;
  const shift = stimulus.shift;
  const kind = stimulus.kind;
  const colors = useMemo(() => [hex, SPLASH_INK], [hex]);
  const pose = useSharedValue<PoseValue>({ color: hex, opacity: 0 });
  const transform = useSharedValue<Transforms3d>([{ translateX: 0 }, { translateY: 0 }]);
  useAnimatedReaction(
    () => clock.value,
    () => {
      'worklet';
      const motion = sampleStimulus(
        index,
        delay,
        angle,
        r0,
        size,
        phase,
        rot0,
        flake,
        turnU,
        shift,
        legacyTime(clock.value),
        widthSv.value,
        heightSv.value,
        lowPower.value,
      );
      pose.value = {
        color: interpolateColor(motion[9], MIX_STOPS, colors),
        opacity: motion[0],
      };
      transform.value = [
        { translateX: motion[2] },
        { translateY: motion[3] },
        { rotate: motion[4] },
        { scaleX: motion[5] },
        { scaleY: motion[6] },
        { rotate: motion[7] - motion[4] },
        { scale: motion[8] },
      ];
    },
  );
  const path = usePathValue((builder) => {
    'worklet';
    const legacy = legacyTime(clock.value);
    writeOutline(builder, kind, wobbleAtLegacy(legacy), (9 * legacy) / 1000 + phase);
  });
  return (
    <Group transform={transform} opacity={select(pose, 'opacity')}>
      <Path path={path} color={select(pose, 'color')} />
    </Group>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 20 },
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
});
