import { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { runOnJS, useDerivedValue, useFrameCallback, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { Canvas, Group, LinearGradient, Path, Rect, Skia, vec } from '@shopify/react-native-skia';

import { S6_STONE, S6_WORD } from '@/splash/s6';
import { INK_RGB, logoPose, SOFT_PT, SPLASH_BG, SPLASH_INK, REST_AT, type LogoPose } from '@/splash/sluket';

/** Rest pose of preset C. Same numbers the animation holds from 3000 ms. */
export const STATIC_LOGO: LogoPose = logoPose(REST_AT, 1, INK_RGB);

/**
 * S6 «bored.» in local space. The parent translates to the screen centre.
 * The dot is the period, at (S6_DOT_X, S6_DOT_Y), not the origin.
 */
export function SplashLogo({ pose }: { pose: SharedValue<LogoPose> }) {
  const word = useMemo(() => Skia.Path.MakeFromSVGString(S6_WORD), []);
  const stone = useMemo(() => Skia.Path.MakeFromSVGString(S6_STONE), []);
  const clip = useDerivedValue(() => {
    const p = pose.value;
    return {
      x: p.clipLeft,
      y: -80,
      width: Math.max(0, p.clipRight - p.clipLeft),
      height: 160,
    };
  });
  const fadeOpacity = useDerivedValue(() => {
    const p = pose.value;
    if (p.settled || p.clipRight <= p.clipLeft) return 0;
    if (p.front >= p.clipRight || p.front + SOFT_PT < p.clipLeft) return 0;
    return 1;
  });
  const fadeX = useDerivedValue(() => pose.value.front);
  const fadeStart = useDerivedValue(() => vec(pose.value.front, 0));
  const fadeEnd = useDerivedValue(() => vec(pose.value.front + SOFT_PT, 0));
  const klump = useDerivedValue(() => {
    const p = pose.value;
    return [{ translateX: p.dx }, { translateY: p.dy }, { scale: p.kw }];
  });
  const klumpOpacity = useDerivedValue(() => pose.value.opacity);
  const klumpColor = useDerivedValue(() => {
    const p = pose.value;
    return `rgb(${p.r}, ${p.g}, ${p.b})`;
  });

  return (
    <Group>
      <Group clip={clip}>
        {word ? <Path path={word} color={SPLASH_INK} /> : null}
        <Rect x={fadeX} y={-60} width={SOFT_PT} height={120} opacity={fadeOpacity}>
          <LinearGradient start={fadeStart} end={fadeEnd} colors={[SPLASH_BG, 'rgba(17,17,16,0)']} />
        </Rect>
      </Group>
      {stone ? (
        <Group transform={klump} opacity={klumpOpacity}>
          <Path path={stone} color={klumpColor} />
        </Group>
      ) : null}
    </Group>
  );
}

/**
 * Static splash plate. #111110, S6 in #F8F6F2, origin on the screen centre.
 * This is the frame the animation rests on.
 */
export function S6Mark({ onFirstPaint }: { onFirstPaint?: () => void }) {
  const { width, height } = useWindowDimensions();
  const pose = useSharedValue(STATIC_LOGO);
  const sent = useSharedValue(0);
  const listen = useSharedValue(onFirstPaint ? 1 : 0);
  const paintRef = useRef(onFirstPaint);
  paintRef.current = onFirstPaint;
  const fire = useCallback(() => {
    paintRef.current?.();
  }, []);
  useEffect(() => {
    listen.value = onFirstPaint ? 1 : 0;
  }, [listen, onFirstPaint]);
  useFrameCallback(() => {
    'worklet';
    if (sent.value === 1 || listen.value === 0) return;
    sent.value = 1;
    runOnJS(fire)();
  });

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={height} color={SPLASH_BG} />
      <Group transform={[{ translateX: width / 2 }, { translateY: height / 2 }]}>
        <SplashLogo pose={pose} />
      </Group>
    </Canvas>
  );
}
