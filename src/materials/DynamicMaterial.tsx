import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Canvas, Group, ImageShader, Paint, Rect, Shader, Skia, useImage, type SkPath } from '@shopify/react-native-skia';

import { materialLocalMatrix, materialPlacement, MATERIAL_DIGIT_COLOR, MATERIAL_DIGIT_FONT, MATERIAL_TILE } from '@/materials/restMaps';
import {
  DARK_RIM_UNSET,
  ENV_LIGHT,
  PATH_LIGHT_SKSL,
  PROFILES,
  buildField,
  darkRimReady,
  parseHex,
  unitLight,
  type DarkRimControls,
  type MaterialId,
} from '@/materials/pathLight';

const BASE = {
  gummi: require('../../assets/materials/2026-11-07/gummi/base.png'),
  skifer: require('../../assets/materials/2026-11-07/skifer/base.png'),
  kull: require('../../assets/materials/2026-11-07/kull/base.png'),
  emalje: require('../../assets/materials/2026-11-07/emalje/base.png'),
  floyel: require('../../assets/materials/2026-11-07/floyel/base.png'),
} as const;

const effect = Skia.RuntimeEffect.Make(PATH_LIGHT_SKSL);

type Props = {
  material: MaterialId;
  /** Nominal body width in points. The artboard stays wider than the body. */
  width: number;
  cx: number;
  cy: number;
  clip: SkPath;
  /** Figtree 400 digits, drawn outside the clipped body. */
  digits?: string;
  digitSize?: number;
  /** Unset until width, placement, and falloff are reviewed. The rim is not drawn. */
  darkRim?: DarkRimControls;
};

const FIELD = 48;

/**
 * Path-aware light on the albedo only. Rest shade and light maps are not sampled.
 * Not mounted by Hjem, the session, or onboarding. The shipped gummi rasters stay.
 * Pillow detail is not baked onto base.png: the radial warp is unresolved.
 */
export function DynamicMaterial({
  material,
  width,
  cx,
  cy,
  clip,
  digits,
  digitSize = 56,
  darkRim = DARK_RIM_UNSET,
}: Props) {
  const albedo = useImage(BASE[material]);
  const place = materialPlacement(width, cx, cy);
  const matrix = materialLocalMatrix(width, cx, cy);
  const profile = PROFILES[material];
  const fieldImage = useMemo(() => {
    const mask = new Uint8Array(FIELD * FIELD);
    const originX = place.tx;
    const originY = place.ty;
    const scale = place.artboardPt / FIELD;
    for (let y = 0; y < FIELD; y += 1) {
      for (let x = 0; x < FIELD; x += 1) {
        if (clip.contains(originX + (x + 0.5) * scale, originY + (y + 0.5) * scale)) mask[y * FIELD + x] = 1;
      }
    }
    const field = buildField(mask, FIELD, FIELD, material);
    const bytes = new Uint8Array(FIELD * FIELD * 4);
    for (let i = 0; i < FIELD * FIELD; i += 1) {
      bytes[i * 4] = Math.round((field.normals[i * 3] * 0.5 + 0.5) * 255);
      bytes[i * 4 + 1] = Math.round((field.normals[i * 3 + 1] * 0.5 + 0.5) * 255);
      bytes[i * 4 + 2] = Math.round((field.normals[i * 3 + 2] * 0.5 + 0.5) * 255);
      bytes[i * 4 + 3] = 255;
    }
    return Skia.Image.MakeImage(
      { width: FIELD, height: FIELD, alphaType: 1, colorType: 4 },
      Skia.Data.fromBytes(bytes),
      FIELD * 4,
    );
  }, [clip, material, place.artboardPt, place.tx, place.ty]);
  const light = unitLight();
  const floor = parseHex(ENV_LIGHT.floor);
  const ready = Boolean(effect && albedo && fieldImage);
  void darkRimReady(darkRim);

  return (
    <View style={{ width: place.artboardPt, height: place.artboardPt }}>
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        {ready && effect && albedo && fieldImage ? (
          <Group clip={clip}>
            <Group layer={<Paint />}>
              <Rect x={place.tx} y={place.ty} width={place.artboardPt} height={place.artboardPt}>
              <Shader
                source={effect}
                uniforms={{
                  pillow: profile.kind === 'pillow' ? 1 : 0,
                  key: ENV_LIGHT.key,
                  amb: ENV_LIGHT.amb,
                  kd: profile.kd,
                  spec: profile.spec,
                  specPow: profile.pow,
                  f0: profile.f0,
                  refl: profile.kind === 'pillow' ? profile.refl : 0,
                  envRefl: profile.kind === 'pillow' ? profile.envRefl : 0,
                  sheen: profile.kind === 'pillow' ? profile.sheen : profile.sheen,
                  sheenExp: profile.sheenExp,
                  boxAmt: profile.kind === 'bevel' ? profile.box : 0,
                  boxW: profile.kind === 'bevel' ? profile.boxW : 0,
                  floorRefl: profile.kind === 'bevel' ? profile.floorRefl : 0,
                  lx: light.x,
                  ly: light.y,
                  lz: light.z,
                  floorR: floor.r,
                  floorG: floor.g,
                  floorB: floor.b,
                }}
              >
                <ImageShader image={albedo} tx={MATERIAL_TILE} ty={MATERIAL_TILE} fit="none" matrix={matrix} />
                <ImageShader
                  image={fieldImage}
                  fit="fill"
                  x={place.tx}
                  y={place.ty}
                  width={place.artboardPt}
                  height={place.artboardPt}
                />
              </Shader>
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
