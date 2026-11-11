import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PixelRatio, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLowPowerMode } from 'expo-battery';
import { useSharedValue } from 'react-native-reanimated';
import { Canvas, FilterMode, Group, Image, MipmapMode, Picture, Rect, Skia } from '@shopify/react-native-skia';

import { SplashLogo } from '@/components/S6Mark';
import type { SplashProps } from '@/components/StillSplash';
import { features } from '@/config/features';
import { sluketMixEffect } from '@/splash/sluketMix';
import { makeStonePath, presentSplash, renderBlobs, type SplashPlate } from '@/splash/sluketDraw';
import {
  colorMixEnabled,
  createStimuli,
  MEGA_MS,
  MIX_OFF_AT,
  SPLASH_BG,
  stimulusLimit,
  WORDMARK_EXIT_MS,
  wordmarkExitPose,
} from '@/splash/sluket';

/**
 * «Sluket» v5 preset C. Always #111110 / #F8F6F2.
 * The clock and the pebble picture are made on the JS thread, after fonts
 * and hydration. iOS drops a picture recorded on the UI runtime, which left
 * the swallow invisible: native wordmark, empty plate, then the rest wordmark.
 * The first painted frame is the rest mark, so the native splash can hide
 * onto the same wordmark before the 150 ms exit.
 */
export function SluketPlay({ onHandoff, onFirstPaint, armed }: SplashProps) {
  const { width, height } = useWindowDimensions();
  const batteryLow = useLowPowerMode();
  const stimuli = useMemo(() => createStimuli(), []);
  const [plate, setPlate] = useState<SplashPlate | null>(null);
  const pose = useSharedValue(wordmarkExitPose(0));
  const handed = useRef(false);
  const doneRef = useRef(false);
  const onHandoffRef = useRef(onHandoff);
  const onFirstPaintRef = useRef(onFirstPaint);
  const sizeRef = useRef({ width, height });
  const stimuliRef = useRef(stimuli);
  const batteryRef = useRef(batteryLow === true);
  onHandoffRef.current = onHandoff;
  onFirstPaintRef.current = onFirstPaint;
  sizeRef.current = { width, height };
  stimuliRef.current = stimuli;
  batteryRef.current = batteryLow === true;

  const finish = useCallback((mode: 'enter' | 'fade') => {
    if (handed.current) return;
    handed.current = true;
    doneRef.current = true;
    onHandoffRef.current(mode);
  }, []);

  useEffect(() => {
    if (!armed) return;
    let alive = true;
    let raf = 0;
    let clock = 0;
    let last = 0;
    let phase: 'warm' | 'run' = 'warm';
    const low = batteryRef.current;
    const limit = stimulusLimit(low);
    const stone = makeStonePath();
    const mixOn = colorMixEnabled(features.sluketColorMix) && sluketMixEffect != null;

    const step = (now: number) => {
      if (!alive || doneRef.current) return;
      const { width: w, height: h } = sizeRef.current;
      if (w < 2 || h < 2) {
        raf = requestAnimationFrame(step);
        return;
      }
      if (phase === 'warm') {
        phase = 'run';
        pose.value = wordmarkExitPose(0);
        raf = requestAnimationFrame(() => {
          if (!alive || doneRef.current) return;
          onFirstPaintRef.current?.();
          raf = requestAnimationFrame(step);
        });
        return;
      }
      if (last === 0) {
        last = now;
        clock = 0;
      } else {
        const dt = now - last;
        last = now;
        clock = Math.min(MEGA_MS, clock + (Number.isFinite(dt) && dt > 0 ? dt : 16));
      }
      const t = clock;
      if (t < WORDMARK_EXIT_MS) {
        pose.value = wordmarkExitPose(t);
      } else {
        try {
          const recorder = Skia.PictureRecorder();
          const canvas = recorder.beginRecording(Skia.XYWHRect(0, 0, w, h));
          const drawn = renderBlobs(
            canvas,
            stimuliRef.current,
            t - WORDMARK_EXIT_MS,
            w,
            h,
            limit,
            mixOn ? 1 : 0,
            stone,
          );
          const picture = recorder.finishRecordingAsPicture();
          const local = t - WORDMARK_EXIT_MS;
          const mixed = mixOn && local < MIX_OFF_AT;
          const next = presentSplash({
            picture,
            width: w,
            height: h,
            pixelRatio: PixelRatio.get(),
            mix: mixed ? { m: drawn.mixM, radius: drawn.mixR, sigma: drawn.sigma } : null,
            effect: mixed ? sluketMixEffect : null,
          });
          if (alive) setPlate(next);
          pose.value = drawn.logo;
        } catch {
          // The wordmark still has to leave and come back if a frame cannot be drawn.
          pose.value = wordmarkExitPose(Math.min(t, WORDMARK_EXIT_MS));
        }
      }
      if (t >= MEGA_MS) {
        finish('enter');
        return;
      }
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [armed, finish, pose]);

  const skip = () => {
    if (doneRef.current) return;
    finish('enter');
  };

  return (
    <View accessibilityViewIsModal style={[styles.layer, { backgroundColor: SPLASH_BG }]}>
      <StatusBar style="light" />
      <Canvas style={styles.fill} pointerEvents="none">
        <Rect x={0} y={0} width={width} height={height} color={SPLASH_BG} />
        {plate?.kind === 'image' && plate.under ? (
          <Image
            image={plate.under}
            x={0}
            y={0}
            width={width}
            height={height}
            fit="fill"
            sampling={{ filter: FilterMode.Linear, mipmap: MipmapMode.None }}
          />
        ) : null}
        {plate?.kind === 'image' ? (
          <Image
            image={plate.image}
            x={0}
            y={0}
            width={width}
            height={height}
            fit="fill"
            sampling={{ filter: FilterMode.Linear, mipmap: MipmapMode.None }}
          />
        ) : null}
        {plate?.kind === 'picture' ? <Picture picture={plate.picture} /> : null}
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

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 20 },
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
});
