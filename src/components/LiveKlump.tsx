import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BlurMask, Canvas, Group, Path, Skia, SweepGradient, vec } from '@shopify/react-native-skia';

import { engravedNumberSize } from '@/onboarding/flow';
import { contourInPoints, outsetContour } from '@/onboarding/formShape';
import { DURATION_UNIT, SHEET_NUMBER_UNIT_GAP, klumpWidth, minutesToIndex } from '@/duration/klumpen';
import { FixedRim, MaterialShade, useLiveMaterial } from '@/materials/DynamicMaterial';
import { materialPlacement } from '@/materials/restMaps';
import type { KlumpMaterialId } from '@/data/types';
import { HOLD, RING_OFFSET, contourGradient } from '@/session/holdToEnd';
import { useTheme } from '@/theme';

type Ring = { progress: number; opacity: number };

type Props = {
  material: KlumpMaterialId;
  minutes: number;
  offsets: readonly number[];
  /** Small choice cells omit the engraved time. */
  digits?: boolean;
  widthPt?: number;
  /** Hold contour. Offset is the source 10 pt gap plus half the rest stroke. */
  ring?: Ring;
};

function toPath(points: readonly { x: number; y: number }[], cx: number, cy: number) {
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

/**
 * One of the five approved surfaces on the current silhouette.
 * Macro normals follow the path. Micro offset stays the bundled master image.
 * The rim is the point-space filter. A rest raster is not stretched over the form.
 */
export function LiveKlump({ material, minutes, offsets, digits = true, widthPt, ring }: Props) {
  const { theme } = useTheme();
  const width = widthPt ?? klumpWidth(minutesToIndex(minutes));
  const place = materialPlacement(width, 0, 0);
  const cx = place.artboardPt / 2;
  const cy = place.artboardPt / 2;
  const placed = materialPlacement(width, cx, cy);
  const body = useMemo(() => contourInPoints(offsets, width), [offsets, width]);
  const fill = useMemo(() => toPath(body, cx, cy), [body, cx, cy]);
  const ringPath = useMemo(() => toPath(outsetContour(body, RING_OFFSET), cx, cy), [body, cx, cy]);
  const field = useLiveMaterial(
    material,
    fill,
    { x: placed.tx, y: placed.ty, size: placed.artboardPt },
    placed.artboardPt,
    false,
    { kind: 'points', width, cx, cy },
    'onboarding',
  );
  const window = { x: placed.tx, y: placed.ty, size: placed.artboardPt };
  const lit = ring ? contourGradient(ring.progress, theme.color.glow.core, ring.opacity, true) : null;
  const track = ring ? contourGradient(1, theme.color.session['ring-track'], ring.opacity, false) : null;
  return (
    <View style={{ width: placed.artboardPt, height: placed.artboardPt }}>
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Group clip={fill}>
          <Path path={fill} style="fill">
            <MaterialShade material={material} field={field} rect={window} />
          </Path>
        </Group>
        {field.rimFilter ? <FixedRim path={fill} filter={field.rimFilter} /> : null}
        {ring && track && lit ? (
          <>
            <Path path={ringPath} style="stroke" strokeWidth={HOLD.trackW} strokeJoin="round" color={track.colors[0]} />
            <Path path={ringPath} style="stroke" strokeWidth={HOLD.trackW} strokeJoin="round">
              <SweepGradient c={vec(cx, cy)} start={0} end={360} origin={vec(cx, cy)} transform={[{ rotate: -Math.PI / 2 }]} colors={lit.colors} positions={lit.positions} />
            </Path>
            <Path path={ringPath} style="stroke" strokeWidth={HOLD.trackW * HOLD.glowGain} strokeJoin="round" opacity={ring.opacity}>
              <SweepGradient c={vec(cx, cy)} start={0} end={360} origin={vec(cx, cy)} transform={[{ rotate: -Math.PI / 2 }]} colors={lit.colors} positions={lit.positions} />
              <BlurMask blur={HOLD.glowRMin} style="normal" respectCTM />
            </Path>
          </>
        ) : null}
      </Canvas>
      {digits ? (
        <View pointerEvents="none" style={styles.face}>
          <Text
            style={{
              fontFamily: theme.fonts.sans,
              fontSize: engravedNumberSize(minutes),
              color: '#F8F6F2',
              fontVariant: ['tabular-nums'],
            }}
          >
            {minutes}
          </Text>
          <Text style={styles.unit}>{DURATION_UNIT}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  face: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  unit: { marginTop: SHEET_NUMBER_UNIT_GAP, fontFamily: 'Figtree_400Regular', fontSize: 13, lineHeight: 16, color: '#F8F6F2' },
});
