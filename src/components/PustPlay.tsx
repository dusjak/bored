import { useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Canvas, Group, Rect } from '@shopify/react-native-skia';
import Animated, { runOnJS, useFrameCallback, useSharedValue } from 'react-native-reanimated';

import { SplashLogo } from '@/components/S6Mark';
import type { SplashProps } from '@/components/StillSplash';
import { usePlateExit } from '@/components/usePlateExit';
import { pustPose, PUST_MOTION_MS } from '@/splash/pust';
import { SPLASH_BG } from '@/splash/splashTiming';

/**
 * D2 Pust. The wordmark is already the rest frame. Klumpen breathes once,
 * back to rest at 700 ms, then the plate cuts or fades.
 * The clock starts when armed, after the native splash has a matching plate underneath.
 */
export function PustPlay({ fading, armed, fadeMs, onHandoff, onDismiss, onFirstPaint }: SplashProps) {
  const { width, height } = useWindowDimensions();
  const armedSv = useSharedValue(armed ? 1 : 0);
  const clock = useSharedValue(0);
  const started = useSharedValue(0);
  const done = useSharedValue(0);
  const painted = useSharedValue(0);
  const pose = useSharedValue(pustPose(0));
  const handed = useRef(false);
  const onHandoffRef = useRef(onHandoff);
  const onFirstPaintRef = useRef(onFirstPaint);
  onHandoffRef.current = onHandoff;
  onFirstPaintRef.current = onFirstPaint;
  const plate = usePlateExit(fading, fadeMs, onDismiss);

  useEffect(() => {
    armedSv.value = armed ? 1 : 0;
  }, [armed, armedSv]);

  const finish = useCallback(() => {
    if (handed.current) return;
    handed.current = true;
    onHandoffRef.current('fade');
  }, []);

  const hideNative = useCallback(() => {
    onFirstPaintRef.current?.();
  }, []);

  useEffect(() => {
    if (!fading) handed.current = false;
  }, [fading]);

  const onFrame = useCallback((frame: { timeSincePreviousFrame: number | null }) => {
    'worklet';
    if (armedSv.value === 0) {
      // Backgrounded. The snapshot is the rest mark, and the next return starts clean.
      started.value = 0;
      clock.value = 0;
      done.value = 0;
      pose.value = pustPose(0);
      return;
    }
    if (done.value === 1) return;
    let t = clock.value;
    if (started.value === 0) {
      started.value = 1;
      t = 0;
    } else {
      t += frame.timeSincePreviousFrame ?? 16;
      if (t > PUST_MOTION_MS) t = PUST_MOTION_MS;
    }
    clock.value = t;
    pose.value = pustPose(t);
    if (painted.value === 0) {
      painted.value = 1;
      runOnJS(hideNative)();
    }
    if (t >= PUST_MOTION_MS && done.value === 0) {
      done.value = 1;
      runOnJS(finish)();
    }
  }, [armedSv, clock, done, finish, hideNative, painted, pose, started]);
  useFrameCallback(onFrame);

  const skip = () => {
    if (!armed || done.value === 1) return;
    done.value = 1;
    pose.value = pustPose(PUST_MOTION_MS);
    finish();
  };

  return (
    <Animated.View accessibilityViewIsModal style={[styles.layer, { backgroundColor: SPLASH_BG }, plate]}>
      <StatusBar style="light" />
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Rect x={0} y={0} width={width} height={height} color={SPLASH_BG} />
        <Group transform={[{ translateX: width / 2 }, { translateY: height / 2 }]}>
          <SplashLogo pose={pose} />
        </Group>
      </Canvas>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="bored"
        accessibilityHint="Trykk for å hoppe over"
        onPress={skip}
        style={styles.fill}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 20 },
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
});
