import { useEffect, useMemo, useRef, useState } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import { StyleSheet, Text, View } from 'react-native';
import {
  Canvas,
  FilterMode,
  Group,
  ImageFilter,
  ImageShader,
  MipmapMode,
  Paint,
  Path,
  Rect,
  Shader,
  Skia,
  useImage,
  type SkImage,
  type SkImageFilter,
  type SkPath,
} from '@shopify/react-native-skia';

import {
  RIM_BLUR_SAMPLE_RADIUS_PT,
  RIM_BLUR_X_SKSL,
  RIM_BLUR_Y_SKSL,
  RIM_EDGE_SAMPLE_RADIUS_PT,
  RIM_EDGE_SKSL,
  RIM_TINT_SKSL,
} from '@/materials/fixedRim';
import { buildMacroField, fitPointRimK, LIVE_MACRO_PX, type LiveSources } from '@/materials/liveField';
import { reportMaterialStatus } from '@/materials/materialStatus';
import { MICRO_PACK } from '@/materials/microPack';
import { materialPlacement, MATERIAL_DIGIT_COLOR, MATERIAL_DIGIT_FONT } from '@/materials/restMaps';
import {
  ENV_LIGHT,
  PATH_LIGHT_SKSL,
  PROFILES,
  parseHex,
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

const MICRO_X = {
  gummi: require('../../assets/materials/2026-11-07/gummi/micro-x.png'),
  skifer: require('../../assets/materials/2026-11-07/skifer/micro-x.png'),
  kull: require('../../assets/materials/2026-11-07/kull/micro-x.png'),
  emalje: require('../../assets/materials/2026-11-07/emalje/micro-x.png'),
  floyel: require('../../assets/materials/2026-11-07/floyel/micro-x.png'),
} as const;

const MICRO_Y = {
  gummi: require('../../assets/materials/2026-11-07/gummi/micro-y.png'),
  skifer: require('../../assets/materials/2026-11-07/skifer/micro-y.png'),
  kull: require('../../assets/materials/2026-11-07/kull/micro-y.png'),
  emalje: require('../../assets/materials/2026-11-07/emalje/micro-y.png'),
  floyel: require('../../assets/materials/2026-11-07/floyel/micro-y.png'),
} as const;

const NEAREST = { filter: FilterMode.Nearest, mipmap: MipmapMode.None } as const;

export function makeFixedRimFilter(rimK: number): SkImageFilter | null {
  const edgeFx = Skia.RuntimeEffect.Make(RIM_EDGE_SKSL);
  const blurXFx = Skia.RuntimeEffect.Make(RIM_BLUR_X_SKSL);
  const blurYFx = Skia.RuntimeEffect.Make(RIM_BLUR_Y_SKSL);
  const tintFx = Skia.RuntimeEffect.Make(RIM_TINT_SKSL);
  if (!edgeFx || !blurXFx || !blurYFx || !tintFx) return null;
  const edge = Skia.ImageFilter.MakeRuntimeShaderWithChildren(
    Skia.RuntimeShaderBuilder(edgeFx),
    RIM_EDGE_SAMPLE_RADIUS_PT,
    ['coverage'],
    [null],
  );
  const blurX = Skia.ImageFilter.MakeRuntimeShaderWithChildren(
    Skia.RuntimeShaderBuilder(blurXFx),
    RIM_BLUR_SAMPLE_RADIUS_PT,
    ['edge'],
    [edge],
  );
  const blurY = Skia.ImageFilter.MakeRuntimeShaderWithChildren(
    Skia.RuntimeShaderBuilder(blurYFx),
    RIM_BLUR_SAMPLE_RADIUS_PT,
    ['edge'],
    [blurX],
  );
  const tint = Skia.RuntimeShaderBuilder(tintFx);
  tint.setUniform('rimK', [rimK]);
  return Skia.ImageFilter.MakeRuntimeShaderWithChildren(tint, 0, ['blurred', 'coverage'], [blurY, null]);
}

const effect = Skia.RuntimeEffect.Make(PATH_LIGHT_SKSL);

export type LiveWindow = { x: number; y: number; size: number };

/** Hjem draws in SVG units. Session draws in points. Both windows are the artboard. */
export type LiveFrame =
  | { kind: 'hjem'; originX: number; originY: number; boxW: number }
  | { kind: 'points'; width: number; cx: number; cy: number };

export type LiveShade = {
  ready: boolean;
  albedo: SkImage | null;
  macro: SkImage | null;
  microX: SkImage | null;
  microY: SkImage | null;
  microHalf: number;
  glint: SkImage | null;
  rim: SkImage | null;
  rimFilter: SkImageFilter | null;
  rimK: number;
};

type Uploaded = { macro: SkImage | null; rim: SkImage | null; rimK: number };

function solidImage(r: number, g: number, b: number): SkImage | null {
  const bytes = new Uint8Array([r, g, b, 255]);
  return Skia.Image.MakeImage({ width: 1, height: 1, alphaType: 1, colorType: 4 }, Skia.Data.fromBytes(bytes), 4);
}

function upload(bytes: Uint8Array, side: number): SkImage | null {
  return Skia.Image.MakeImage(
    { width: side, height: side, alphaType: 1, colorType: 4 },
    Skia.Data.fromBytes(bytes),
    side * 4,
  );
}

function sourceAt(frame: LiveFrame, x: number, y: number): { x: number; y: number } {
  if (frame.kind === 'points') {
    const place = materialPlacement(frame.width, frame.cx, frame.cy);
    const inv = place.ptPerPx === 0 ? 0 : 1 / place.ptPerPx;
    return { x: (x - place.tx) * inv, y: (y - place.ty) * inv };
  }
  const s = frame.boxW === 0 ? 0 : 720 / frame.boxW;
  return { x: (x - frame.originX) * s + 600, y: (y - frame.originY) * s + 600 };
}

function asBytes(raw: unknown): Uint8Array | null {
  if (raw instanceof Uint8Array) return raw;
  if (raw instanceof Uint8ClampedArray) return new Uint8Array(raw);
  return null;
}

/**
 * Macro normals are rebuilt when the silhouette key changes.
 * The micro offset is the bundled 16-bit image. The rim is the point-space filter.
 * Rim gain is fit once, not on every touch frame.
 */
export function useLiveMaterial(
  material: MaterialId,
  clip: SkPath | null,
  window: LiveWindow,
  artboardPt: number,
  moving: boolean,
  frame: LiveFrame,
  surface: string,
): LiveShade {
  const [imageFailed, setImageFailed] = useState(false);
  const albedo = useImage(BASE[material]);
  const microX = useImage(MICRO_X[material], () => setImageFailed(true));
  const microY = useImage(MICRO_Y[material], () => setImageFailed(true));
  const glint = useRef<SkImage | null>(null);
  const rimDot = useRef<SkImage | null>(null);
  if (!glint.current) glint.current = solidImage(0, 0, 0);
  if (!rimDot.current) rimDot.current = solidImage(0, 0, 0);
  const pixels = useRef<{ image: SkImage; px: Uint8Array; w: number; h: number } | null>(null);
  const gain = useRef<{ k: number; artboardPt: number; material: MaterialId } | null>(null);
  const [uploaded, setUploaded] = useState<Uploaded>({ macro: null, rim: null, rimK: 0 });
  const frameRef = useRef(frame);
  frameRef.current = frame;
  const frameKey =
    frame.kind === 'hjem'
      ? `hjem:${frame.originX}:${frame.originY}:${frame.boxW}`
      : `points:${frame.width}:${frame.cx}:${frame.cy}`;

  useEffect(() => {
    if (!clip || !albedo || !effect) return;
    let cancel = false;
    const placed = frameRef.current;
    const handle = requestAnimationFrame(() => {
      if (cancel) return;
      if (!pixels.current || pixels.current.image !== albedo) {
        const raw = albedo.readPixels(0, 0, {
          width: albedo.width(),
          height: albedo.height(),
          colorType: 4,
          alphaType: 1,
        });
        const px = asBytes(raw);
        pixels.current = px ? { image: albedo, px, w: albedo.width(), h: albedo.height() } : null;
      }
      const sources: LiveSources = {
        albedo: pixels.current?.px ?? null,
        albedoW: pixels.current?.w ?? 0,
        albedoH: pixels.current?.h ?? 0,
        sourceAt: (x, y) => sourceAt(placed, x, y),
      };
      const macro = upload(buildMacroField(material, clip, window.x, window.y, window.size), LIVE_MACRO_PX);
      let rimK = gain.current && gain.current.material === material ? gain.current.k : 0;
      if (!moving || !gain.current || gain.current.material !== material) {
        const bounds = clip.getBounds();
        const pointsPerUnit = window.size === 0 ? 0 : artboardPt / window.size;
        rimK = fitPointRimK(material, clip, bounds, pointsPerUnit, sources);
        gain.current = { k: rimK, artboardPt, material };
      }
      if (cancel) {
        macro?.dispose();
        return;
      }
      setUploaded({ macro, rim: null, rimK });
    });
    return () => {
      cancel = true;
      cancelAnimationFrame(handle);
    };
  }, [albedo, artboardPt, clip, frameKey, material, moving, window.size, window.x, window.y]);

  useEffect(() => {
    const current = uploaded;
    return () => {
      current.macro?.dispose();
    };
  }, [uploaded]);

  const rimFilter = useMemo(() => makeFixedRimFilter(uploaded.rimK), [uploaded.rimK]);
  const microHalf = MICRO_PACK[material].half;
  const imagesReady = Boolean(effect && albedo && uploaded.macro && microX && microY && glint.current && rimDot.current);
  const ready = material !== 'kull' && !imageFailed && imagesReady && Boolean(rimFilter);
  useEffect(() => {
    if (material === 'kull') {
      reportMaterialStatus(surface, { phase: 'fallback', reason: 'kull-glint-unbundled' });
      return;
    }
    if (imageFailed || !effect) {
      reportMaterialStatus(surface, { phase: 'fallback', reason: imageFailed ? 'micro-offset-unread' : 'light-shader' });
      return;
    }
    if (!rimFilter && imagesReady) {
      reportMaterialStatus(surface, { phase: 'fallback', reason: 'fixed-rim-shader' });
      return;
    }
    if (!ready) {
      reportMaterialStatus(surface, { phase: 'pending', reason: 'images-loading' });
      return;
    }
    reportMaterialStatus(surface, { phase: 'live', reason: 'macro-micro-fixed-rim' });
  }, [effect, imageFailed, imagesReady, material, ready, rimFilter, surface]);
  return {
    ready,
    albedo,
    macro: uploaded.macro,
    microX,
    microY,
    microHalf,
    glint: glint.current,
    rim: rimDot.current,
    rimFilter,
    rimK: uploaded.rimK,
  };
}

/** Shader children follow the SKSL order. The parent path is the only clip. */
export function MaterialShade({
  material,
  field,
  rect,
}: {
  material: MaterialId;
  field: LiveShade;
  rect: LiveWindow;
}) {
  if (!effect || !field.ready || !field.albedo || !field.macro || !field.microX || !field.microY || !field.glint || !field.rim) return null;
  const profile = PROFILES[material];
  const light = unitLight();
  const floor = parseHex(ENV_LIGHT.floor);
  return (
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
        sheen: profile.sheen,
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
        microHalf: field.microHalf,
        rimK: 0,
      }}
    >
      <ImageShader image={field.albedo} fit="fill" x={rect.x} y={rect.y} width={rect.size} height={rect.size} tx="clamp" ty="clamp" />
      <ImageShader image={field.macro} fit="fill" x={rect.x} y={rect.y} width={rect.size} height={rect.size} tx="clamp" ty="clamp" />
      <ImageShader image={field.microX} sampling={NEAREST} fit="fill" x={rect.x} y={rect.y} width={rect.size} height={rect.size} tx="clamp" ty="clamp" />
      <ImageShader image={field.microY} sampling={NEAREST} fit="fill" x={rect.x} y={rect.y} width={rect.size} height={rect.size} tx="clamp" ty="clamp" />
      <ImageShader image={field.glint} fit="fill" x={rect.x} y={rect.y} width={rect.size} height={rect.size} tx="clamp" ty="clamp" />
      <ImageShader image={field.rim} fit="fill" x={rect.x} y={rect.y} width={rect.size} height={rect.size} tx="clamp" ty="clamp" />
    </Shader>
  );
}

/** Point-space silhouette. The radii inside the filter stay in points. */
export function FixedRim({
  path,
  filter,
}: {
  path: SkPath | SharedValue<SkPath>;
  filter: SkImageFilter;
}) {
  return (
    <Group blendMode="plus" layer={<Paint><ImageFilter filter={filter} /></Paint>}>
      <Path path={path} color="white" />
    </Group>
  );
}

type Props = {
  material: MaterialId;
  width: number;
  cx: number;
  cy: number;
  clip: SkPath;
  /** Figtree 400 digits, drawn outside the clipped body. */
  digits?: string;
  digitSize?: number;
};

/**
 * Standalone artboard. Hjem and the session draw `MaterialShade` inside their
 * own canvases instead, so the digits stay in the existing overlay.
 * Gummi is the only mounted surface. The other four stay unwired.
 */
export function DynamicMaterial({ material, width, cx, cy, clip, digits, digitSize = 56 }: Props) {
  const place = materialPlacement(width, cx, cy);
  const window = { x: place.tx, y: place.ty, size: place.artboardPt };
  const field = useLiveMaterial(material, clip, window, place.artboardPt, false, { kind: 'points', width, cx, cy }, 'standalone');
  return (
    <View style={{ width: place.artboardPt, height: place.artboardPt }}>
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Group clip={clip}>
          <Rect x={place.tx} y={place.ty} width={place.artboardPt} height={place.artboardPt}>
            <MaterialShade material={material} field={field} rect={window} />
          </Rect>
        </Group>
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
