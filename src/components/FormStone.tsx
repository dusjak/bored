import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { runOnJS, useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Canvas, Circle, Group, Path, Skia } from '@shopify/react-native-skia';

import type { KlumpMaterialId } from '@/data/types';
import { FixedRim, MaterialShade, useLiveMaterial } from '@/materials/DynamicMaterial';
import { materialPlacement } from '@/materials/restMaps';
import { deform, REST_RADII } from '@/onboarding/formShape';
import { followOffsets, radialCage, SHAPE_FOLLOW, smoothClosed } from '@/onboarding/formMotion';

type Props = {
  material: KlumpMaterialId;
  /** Inner limit only. The stone width does not follow the minutes. */
  minutes: number;
  widthPt: number;
  offsets: readonly number[];
  ringColor: string;
  /** Once, when the finger lifts. Not on each touch sample. */
  onCommit: (offsets: number[]) => void;
};

function pathFrom(points: readonly { x: number; y: number }[], cx: number, cy: number) {
  const path = Skia.PathBuilder.Make();
  const first = points[0];
  if (!first) return path.build();
  path.moveTo(cx + first.x, cy + first.y);
  for (let i = 1; i < points.length; i += 1) {
    const point = points[i];
    if (point) path.lineTo(cx + point.x, cy + point.y);
  }
  path.close();
  return path.build();
}

function haptic(material: string) {
  const style =
    material === 'skifer'
      ? Haptics.ImpactFeedbackStyle.Rigid
      : material === 'kull'
        ? Haptics.ImpactFeedbackStyle.Light
        : Haptics.ImpactFeedbackStyle.Soft;
  void Haptics.impactAsync(style);
}

/**
 * One canvas. The finger updates shared bins on the UI thread.
 * The outline is a Catmull-Rom through those bins, rebuilt in the Skia path
 * worklet. The rim filter is the one compiled for this material; the live path
 * is its coverage, so the edge follows the finger without a new shader.
 * The 64² field is rebuilt only when the finger lifts.
 */
export function FormStone({ material, minutes, widthPt, offsets, ringColor, onCommit }: Props) {
  const place = materialPlacement(widthPt, 0, 0);
  const cx = place.artboardPt / 2;
  const cy = place.artboardPt / 2;
  const placed = materialPlacement(widthPt, cx, cy);
  const window = { x: placed.tx, y: placed.ty, size: placed.artboardPt };
  const shown = useSharedValue<number[]>([...offsets]);
  const target = useSharedValue<number[]>([...offsets]);
  const start = useSharedValue<number[]>([...offsets]);
  const dragging = useSharedValue(0);
  const began = useSharedValue(0);
  const fired = useSharedValue(0);
  const touchX = useSharedValue(0);
  const touchY = useSharedValue(0);
  const angle = useSharedValue(0);

  useEffect(() => {
    const copy = [...offsets];
    shown.value = copy;
    target.value = [...copy];
    start.value = [...copy];
  }, [offsets, shown, start, target]);

  useFrameCallback(() => {
    'worklet';
    const step = followOffsets(shown.value, target.value, SHAPE_FOLLOW);
    if (step.remaining < 0.04 && dragging.value === 0) return;
    shown.value = step.next;
  });

  const drawn = useDerivedValue(() => {
    'worklet';
    const points = smoothClosed(radialCage(shown.value, widthPt, REST_RADII));
    const builder = Skia.PathBuilder.Make();
    const first = points[0];
    if (!first) return builder.build();
    builder.moveTo(cx + first.x, cy + first.y);
    for (let i = 1; i < points.length; i += 1) {
      const point = points[i];
      if (point) builder.lineTo(cx + point.x, cy + point.y);
    }
    builder.close();
    return builder.build();
  });

  const settled = useMemo(
    () => pathFrom(smoothClosed(radialCage(offsets, widthPt, REST_RADII)), cx, cy),
    [cx, cy, offsets, widthPt],
  );
  const field = useLiveMaterial(
    material,
    settled,
    window,
    placed.artboardPt,
    false,
    { kind: 'points', width: widthPt, cx, cy },
    'form',
    `form:${material}:${widthPt}:${offsets.join(',')}`,
  );

  const publish = (next: number[]) => {
    let changed = false;
    for (let i = 0; i < next.length; i += 1) {
      if (next[i] !== offsets[i]) changed = true;
    }
    if (!changed) return;
    if (material === 'emalje') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCommit(next);
  };

  const pan = Gesture.Pan()
    .maxPointers(1)
    .onBegin((event) => {
      'worklet';
      dragging.value = 1;
      began.value = Date.now();
      fired.value = 0;
      const copy = shown.value.slice();
      start.value = copy;
      target.value = copy.slice();
      const x = event.x - cx;
      const y = event.y - cy;
      touchX.value = x;
      touchY.value = y;
      angle.value = Math.atan2(y, x);
    })
    .onUpdate((event) => {
      'worklet';
      const travel = Math.hypot(event.translationX, event.translationY);
      const x = event.x - cx;
      const y = event.y - cy;
      const radial = Math.hypot(x, y) >= Math.hypot(touchX.value, touchY.value) ? 'out' : 'in';
      const next = deform({
        start: start.value,
        material,
        minutes,
        widthPt,
        travelPt: travel,
        angle: angle.value,
        radial,
        elapsedMs: Date.now() - began.value,
      });
      target.value = next.offsets;
      if (next.changed && material !== 'emalje' && fired.value === 0) {
        fired.value = 1;
        runOnJS(haptic)(material);
      }
    })
    .onFinalize(() => {
      'worklet';
      dragging.value = 0;
      runOnJS(publish)(target.value.slice());
    });

  return (
    <GestureHandlerRootView style={{ width: placed.artboardPt, height: placed.artboardPt }}>
      <GestureDetector gesture={pan}>
        <View style={{ width: placed.artboardPt, height: placed.artboardPt }}>
          <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
            <Circle cx={cx} cy={cy} r={widthPt * 0.62} style="stroke" strokeWidth={1.5} color={ringColor} />
            <Group clip={drawn}>
              <Path path={drawn} style="fill">
                <MaterialShade material={material} field={field} rect={window} />
              </Path>
            </Group>
            {field.rimFilter ? <FixedRim path={drawn} filter={field.rimFilter} /> : null}
          </Canvas>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}
