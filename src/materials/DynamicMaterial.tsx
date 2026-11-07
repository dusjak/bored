import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Canvas, Group, ImageShader, Paint, Rect, Shader, Skia, useImage, type SkPath } from '@shopify/react-native-skia';

import { materialLocalMatrix, materialPlacement, sourcePixelAt, MATERIAL_DIGIT_COLOR, MATERIAL_DIGIT_FONT, MATERIAL_TILE } from '@/materials/restMaps';
import { SOURCE_MASTER, masterGlintAt, masterNormals } from '@/materials/sourceParity';
import {
  ENV_LIGHT,
  PATH_LIGHT_SKSL,
  PROFILES,
  RIM_SAMPLE_PX_PER_PT,
  fitRim,
  litFromBase,
  parseHex,
  rimBand,
  unitLight,
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
};

const NORMAL_PX = SOURCE_MASTER;

function normalImage(normals: Float32Array) {
  const count = NORMAL_PX * NORMAL_PX;
  const bytes = new Uint8Array(count * 4);
  for (let i = 0; i < count; i += 1) {
    bytes[i * 4] = Math.round((normals[i * 3] * 0.5 + 0.5) * 255);
    bytes[i * 4 + 1] = Math.round((normals[i * 3 + 1] * 0.5 + 0.5) * 255);
    bytes[i * 4 + 2] = Math.round((normals[i * 3 + 2] * 0.5 + 0.5) * 255);
    bytes[i * 4 + 3] = 255;
  }
  return Skia.Image.MakeImage(
    { width: NORMAL_PX, height: NORMAL_PX, alphaType: 1, colorType: 4 },
    Skia.Data.fromBytes(bytes),
    NORMAL_PX * 4,
  );
}

/**
 * Path-aware light on the albedo only. Rest shade and light maps are not sampled.
 * Not mounted by Hjem, the session, or onboarding. The shipped gummi rasters stay.
 * Rim gain is fit on this albedo after the 1 px source normal. It stays 0
 * when those pixels cannot be read. Gummi uses the warped canvas normals.
 * Bevel normals are the 1 px gradient of the source height. The shader is not mounted.
 */
export function DynamicMaterial({
  material,
  width,
  cx,
  cy,
  clip,
  digits,
  digitSize = 56,
}: Props) {
  const albedo = useImage(BASE[material]);
  const place = materialPlacement(width, cx, cy);
  const matrix = materialLocalMatrix(width, cx, cy);
  const profile = PROFILES[material];
  const fieldImage = useMemo(() => normalImage(masterNormals(material)), [material]);
  const glintImage = useMemo(() => {
    const bytes = new Uint8Array(NORMAL_PX * NORMAL_PX * 4);
    for (let y = 0; y < NORMAL_PX; y += 1) {
      for (let x = 0; x < NORMAL_PX; x += 1) {
        const i = y * NORMAL_PX + x;
        bytes[i * 4] = Math.round(Math.min(1, Math.max(0, masterGlintAt(material, x, y))) * 255);
        bytes[i * 4 + 3] = 255;
      }
    }
    return Skia.Image.MakeImage(
      { width: NORMAL_PX, height: NORMAL_PX, alphaType: 1, colorType: 4 },
      Skia.Data.fromBytes(bytes),
      NORMAL_PX * 4,
    );
  }, [material]);
  const rimImage = useMemo(() => {
    const px = RIM_SAMPLE_PX_PER_PT;
    const cols = Math.max(1, Math.round(place.artboardPt * px));
    const rows = cols;
    const mask = new Uint8Array(cols * rows);
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        if (clip.contains(place.tx + (x + 0.5) / px, place.ty + (y + 0.5) / px)) mask[y * cols + x] = 1;
      }
    }
    const raw = albedo?.readPixels(0, 0, {
      width: albedo.width(),
      height: albedo.height(),
      colorType: 4,
      alphaType: 1,
    });
    const basePx = raw instanceof Uint8Array ? raw : null;
    const baseW = albedo?.width() ?? 0;
    const baseH = albedo?.height() ?? 0;
    const readable = Boolean(basePx && baseW > 0 && baseH > 0 && basePx.length >= baseW * baseH * 4);
    let band = rimBand(mask, cols, rows, px).band;
    let k = 0;
    if (readable && basePx) {
      const normals = masterNormals(material);
      const plate = new Float32Array(cols * rows * 3);
      for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < cols; x += 1) {
          const fx = Math.min(NORMAL_PX - 1, Math.max(0, Math.floor(((x + 0.5) / cols) * NORMAL_PX)));
          const fy = Math.min(NORMAL_PX - 1, Math.max(0, Math.floor(((y + 0.5) / rows) * NORMAL_PX)));
          const n = fy * NORMAL_PX + fx;
          const canvasX = place.tx + (x + 0.5) / px;
          const canvasY = place.ty + (y + 0.5) / px;
          const src = sourcePixelAt(width, cx, cy, canvasX, canvasY);
          const color = litFromBase(
            basePx,
            baseW,
            baseH,
            src.x,
            src.y,
            { x: normals[n * 3], y: normals[n * 3 + 1], z: normals[n * 3 + 2] },
            material,
            masterGlintAt(material, fx, fy),
          );
          const i = y * cols + x;
          plate[i * 3] = color.r;
          plate[i * 3 + 1] = color.g;
          plate[i * 3 + 2] = color.b;
        }
      }
      const fit = fitRim(plate, mask, cols, rows, px);
      band = fit.band;
      k = fit.k;
    }
    const bytes = new Uint8Array(cols * rows * 4);
    for (let i = 0; i < band.length; i += 1) {
      bytes[i * 4] = Math.round(Math.min(1, Math.max(0, band[i])) * 255);
      bytes[i * 4 + 3] = 255;
    }
    return {
      k,
      image: Skia.Image.MakeImage(
        { width: cols, height: rows, alphaType: 1, colorType: 4 },
        Skia.Data.fromBytes(bytes),
        cols * 4,
      ),
    };
  }, [albedo, clip, cx, cy, material, place.artboardPt, place.tx, place.ty, width]);
  const light = unitLight();
  const floor = parseHex(ENV_LIGHT.floor);
  const ready = Boolean(effect && albedo && fieldImage && glintImage && rimImage.image);

  return (
    <View style={{ width: place.artboardPt, height: place.artboardPt }}>
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        {ready && effect && albedo && fieldImage && glintImage && rimImage.image ? (
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
                  rimK: rimImage.k,
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
                <ImageShader
                  image={glintImage}
                  fit="fill"
                  x={place.tx}
                  y={place.ty}
                  width={place.artboardPt}
                  height={place.artboardPt}
                />
                <ImageShader
                  image={rimImage.image}
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
