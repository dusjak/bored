import { StyleSheet, Text, View } from 'react-native';
import { Canvas, Group, ImageShader, Paint, Rect, useImage, type SkPath } from '@shopify/react-native-skia';

import {
  MATERIAL_BLEND,
  MATERIAL_DIGIT_COLOR,
  MATERIAL_DIGIT_FONT,
  MATERIAL_IDS,
  MATERIAL_TILE,
  materialLocalMatrix,
  materialPlacement,
  type MaterialId,
} from '@/materials/restMaps';

const MASTERS = {
  gummi: {
    base: require('../../assets/materials/2026-11-07/gummi/base.png'),
    shade: require('../../assets/materials/2026-11-07/gummi/shade-multiply.png'),
    light: require('../../assets/materials/2026-11-07/gummi/light-screen.png'),
  },
  skifer: {
    base: require('../../assets/materials/2026-11-07/skifer/base.png'),
    shade: require('../../assets/materials/2026-11-07/skifer/shade-multiply.png'),
    light: require('../../assets/materials/2026-11-07/skifer/light-screen.png'),
  },
  kull: {
    base: require('../../assets/materials/2026-11-07/kull/base.png'),
    shade: require('../../assets/materials/2026-11-07/kull/shade-multiply.png'),
    light: require('../../assets/materials/2026-11-07/kull/light-screen.png'),
  },
  emalje: {
    base: require('../../assets/materials/2026-11-07/emalje/base.png'),
    shade: require('../../assets/materials/2026-11-07/emalje/shade-multiply.png'),
    light: require('../../assets/materials/2026-11-07/emalje/light-screen.png'),
  },
  floyel: {
    base: require('../../assets/materials/2026-11-07/floyel/base.png'),
    shade: require('../../assets/materials/2026-11-07/floyel/shade-multiply.png'),
    light: require('../../assets/materials/2026-11-07/floyel/light-screen.png'),
  },
} as const;

type Props = {
  material: MaterialId;
  /** Nominal body width in points. Not the artboard width. */
  width: number;
  cx: number;
  cy: number;
  clip: SkPath;
  /** Figtree 400 digits, drawn outside the clipped body. */
  digits?: string;
  digitSize?: number;
};

/**
 * Rest stack: albedo, then multiply, then screen, clipped once.
 * Nothing here is mounted by Hjem, the session, or onboarding.
 * The shipped gummi rasters stay on those stones.
 */
export function RestMaterial({ material, width, cx, cy, clip, digits, digitSize = 56 }: Props) {
  const maps = MASTERS[material];
  const base = useImage(maps.base);
  const shade = useImage(maps.shade);
  const light = useImage(maps.light);
  const place = materialPlacement(width, cx, cy);
  const matrix = materialLocalMatrix(width, cx, cy);
  const ready = base && shade && light;

  return (
    <View style={{ width: place.artboardPt, height: place.artboardPt }}>
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        {ready ? (
          <Group clip={clip}>
            <Group layer={<Paint />}>
              <Rect x={place.tx} y={place.ty} width={place.artboardPt} height={place.artboardPt}>
                <ImageShader image={base} tx={MATERIAL_TILE} ty={MATERIAL_TILE} fit="none" matrix={matrix} />
              </Rect>
              <Rect
                x={place.tx}
                y={place.ty}
                width={place.artboardPt}
                height={place.artboardPt}
                blendMode={MATERIAL_BLEND[1]}
              >
                <ImageShader image={shade} tx={MATERIAL_TILE} ty={MATERIAL_TILE} fit="none" matrix={matrix} />
              </Rect>
              <Rect
                x={place.tx}
                y={place.ty}
                width={place.artboardPt}
                height={place.artboardPt}
                blendMode={MATERIAL_BLEND[2]}
              >
                <ImageShader image={light} tx={MATERIAL_TILE} ty={MATERIAL_TILE} fit="none" matrix={matrix} />
              </Rect>
            </Group>
          </Group>
        ) : null}
      </Canvas>
      {digits ? (
        <Text
          style={{
            fontFamily: MATERIAL_DIGIT_FONT,
            fontVariant: ['tabular-nums'],
            color: MATERIAL_DIGIT_COLOR,
            fontSize: digitSize,
          }}
        >
          {digits}
        </Text>
      ) : null}
    </View>
  );
}

export const REST_MATERIAL_IDS = MATERIAL_IDS;
