import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PixelRatio, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLowPowerMode } from 'expo-battery';
import {
  runOnJS,
  useAnimatedReaction,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import {
  Canvas,
  Group,
  Paint,
  Picture,
  RuntimeShader,
  Skia,
  type SkPath,
  type SkPicture,
} from '@shopify/react-native-skia';

import { SplashLogo } from '@/components/S6Mark';
import type { SplashProps } from '@/components/StillSplash';
import { features } from '@/config/features';
import { sluketMixEffect } from '@/splash/sluketMix';
import { makeStonePath, renderBlobs } from '@/splash/sluketDraw';
import {
  colorMixEnabled,
  createStimuli,
  MEGA_MS,
  MIX_OFF_AT,
  mixCellPt,
  mixShaderUnits,
  SPLASH_BG,
  stimulusLimit,
  WORDMARK_EXIT_MS,
  wordmarkExitPose,
} from '@/splash/sluket';

function blankPicture(): SkPicture {
  const recorder = Skia.PictureRecorder();
  recorder.beginRecording(Skia.XYWHRect(0, 0, 1, 1));
  return recorder.finishRecordingAsPicture();
}

/**
 * «Sluket» v5 preset C. Always #111110 / #F8F6F2.
 * Pebbles are one picture per frame. The colour mix runs on a 4 pt grid
 * (8 pt in Low Power Mode) and is removed once the ink has settled.
 * The clock starts at the first drawn frame, after fonts and hydration.
 */
export function SluketPlay({ onHandoff, onFirstPaint, armed }: SplashProps) {
  const { width, height } = useWindowDimensions();
  const batteryLow = useLowPowerMode();
  const mixFlag = colorMixEnabled(features.sluketColorMix) && sluketMixEffect != null;
  const stimuli = useMemo(() => createStimuli(), []);
  const [showMix, setShowMix] = useState(mixFlag);
  const cell = mixCellPt(batteryLow);
  const cellSv = useSharedValue(cell);
  const limitSv = useSharedValue(stimulusLimit(batteryLow));
  const armedSv = useSharedValue(armed ? 1 : 0);
  const widthSv = useSharedValue(width);
  const heightSv = useSharedValue(height);
  const clock = useSharedValue(0);
  const started = useSharedValue(0);
  const done = useSharedValue(0);
  const painted = useSharedValue(0);
  const pose = useSharedValue(wordmarkExitPose(0));
  const blobs = useSharedValue<SkPicture>(blankPicture());
  const stone = useSharedValue<SkPath | null>(null);
  const mixM = useSharedValue(1);
  const mixR = useSharedValue(mixShaderUnits(20, cell));
  const sigma = useSharedValue(mixShaderUnits(4, cell));
  const handed = useRef(false);
  const onHandoffRef = useRef(onHandoff);
  const onFirstPaintRef = useRef(onFirstPaint);
  onHandoffRef.current = onHandoff;
  onFirstPaintRef.current = onFirstPaint;

  useEffect(() => {
    widthSv.value = width;
    heightSv.value = height;
    armedSv.value = armed ? 1 : 0;
    cellSv.value = cell;
    limitSv.value = stimulusLimit(batteryLow);
  }, [armed, armedSv, batteryLow, cell, cellSv, height, heightSv, limitSv, width, widthSv]);

  const finish = useCallback((mode: 'enter' | 'fade') => {
    if (handed.current) return;
    handed.current = true;
    onHandoffRef.current(mode);
  }, []);

  const hideNative = useCallback(() => {
    onFirstPaintRef.current?.();
  }, []);

  const stopMix = useCallback(() => {
    setShowMix(false);
  }, []);

  const onFrame = useCallback((frame: { timeSincePreviousFrame: number | null }) => {
    'worklet';
    if (armedSv.value === 0 || done.value === 1) return;
    const w = widthSv.value;
    const h = heightSv.value;
    if (w < 2 || h < 2) return;
    if (stone.value == null) stone.value = makeStonePath();
    let t = clock.value;
    if (started.value === 0) {
      started.value = 1;
      t = 0;
    } else {
      t += frame.timeSincePreviousFrame ?? 16;
      if (t > MEGA_MS) t = MEGA_MS;
    }
    clock.value = t;
    if (t < WORDMARK_EXIT_MS) {
      pose.value = wordmarkExitPose(t);
    } else {
      const local = t - WORDMARK_EXIT_MS;
      const recorder = Skia.PictureRecorder();
      const canvas = recorder.beginRecording(Skia.XYWHRect(0, 0, w, h));
      const drawn = renderBlobs(
        canvas,
        stimuli,
        local,
        w,
        h,
        limitSv.value,
        mixFlag ? 1 : 0,
        stone.value,
      );
      blobs.value = recorder.finishRecordingAsPicture();
      pose.value = drawn.logo;
      const unit = cellSv.value;
      mixM.value = drawn.mixM;
      mixR.value = mixShaderUnits(drawn.mixR, unit);
      sigma.value = mixShaderUnits(drawn.sigma, unit);
    }
    if (painted.value === 0) {
      painted.value = 1;
      runOnJS(hideNative)();
    }
    if (t >= MEGA_MS && done.value === 0) {
      done.value = 1;
      runOnJS(finish)('enter');
    }
  }, [
    armedSv,
    blobs,
    cellSv,
    clock,
    done,
    finish,
    heightSv,
    hideNative,
    limitSv,
    mixFlag,
    mixM,
    mixR,
    painted,
    pose,
    sigma,
    started,
    stone,
    stimuli,
    widthSv,
  ]);
  useFrameCallback(onFrame);

  useAnimatedReaction(
    () => clock.value >= WORDMARK_EXIT_MS + MIX_OFF_AT,
    (off, prev) => {
      if (off && prev !== true) runOnJS(stopMix)();
    },
  );

  const uniforms = useDerivedValue(() => ({
    m: mixM.value,
    radius: mixR.value,
    sigma: sigma.value,
  }));

  const skip = () => {
    if (done.value === 1) return;
    done.value = 1;
    finish('enter');
  };

  return (
    <View accessibilityViewIsModal style={[styles.layer, { backgroundColor: SPLASH_BG }]}>
      <StatusBar style="light" />
      {showMix && sluketMixEffect ? (
        <MixCanvas
          picture={blobs}
          width={width}
          height={height}
          cell={cell}
          uniforms={uniforms}
          source={sluketMixEffect}
        />
      ) : null}
      <Canvas style={[styles.fill, styles.clear]} pointerEvents="none">
        {showMix ? null : <Picture picture={blobs} />}
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
    </View>
  );
}

function MixCanvas({
  picture,
  width,
  height,
  cell,
  uniforms,
  source,
}: {
  picture: SharedValue<SkPicture>;
  width: number;
  height: number;
  cell: number;
  uniforms: SharedValue<{ m: number; radius: number; sigma: number }>;
  source: NonNullable<typeof sluketMixEffect>;
}) {
  const ratio = PixelRatio.get();
  const bufW = Math.max(1, width / (cell * ratio));
  const bufH = Math.max(1, height / (cell * ratio));
  const fit = bufW / Math.max(1, width);
  return (
    <View pointerEvents="none" style={styles.fill}>
      <Canvas
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: bufW,
          height: bufH,
          transformOrigin: 'left top',
          transform: [{ scale: width / bufW }],
        }}
      >
        <Group layer={<Paint><RuntimeShader source={source} uniforms={uniforms} /></Paint>} transform={[{ scale: fit }]}>
          <Picture picture={picture} />
        </Group>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 20 },
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  clear: { backgroundColor: 'transparent' },
});
