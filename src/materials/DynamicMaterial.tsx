import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Canvas, Group, ImageShader, Rect, Shader, Skia, useImage, type SkImage, type SkPath } from '@shopify/react-native-skia';

import { buildLiveFields, LIVE_MACRO_PX, type LiveSources } from '@/materials/liveField';
import { materialPlacement, MATERIAL_DIGIT_COLOR, MATERIAL_DIGIT_FONT } from '@/materials/restMaps';
import {
  ENV_LIGHT,
  PATH_LIGHT_SKSL,
  PROFILES,
  parseHex,
  unitLight,
  type MaterialId,
} from '@/materials/pathLight';

const GUMMI_BASE = require('../../assets/materials/2026-11-07/gummi/base.png');

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
  micro: SkImage | null;
  glint: SkImage | null;
  rim: SkImage | null;
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
 * Builds the macro and the rim off the render path.
 * `moving` reuses the last fitted rim gain. The micro image stays mid-gray:
 * the Node height grids are not in the Expo Go bundle.
 */
export function useLiveMaterial(
  material: MaterialId,
  clip: SkPath | null,
  window: LiveWindow,
  artboardPt: number,
  moving: boolean,
  frame: LiveFrame,
): LiveShade {
  const albedo = useImage(GUMMI_BASE);
  const micro = useRef<SkImage | null>(null);
  const glint = useRef<SkImage | null>(null);
  if (!micro.current) micro.current = solidImage(128, 128, 128);
  if (!glint.current) glint.current = solidImage(0, 0, 0);
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
    if (material !== 'gummi' || !clip || !albedo || !effect) return;
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
      const cached =
        moving && gain.current && gain.current.material === material && gain.current.artboardPt === artboardPt
          ? gain.current.k
          : null;
      const sources: LiveSources = {
        albedo: pixels.current?.px ?? null,
        albedoW: pixels.current?.w ?? 0,
        albedoH: pixels.current?.h ?? 0,
        sourceAt: (x, y) => sourceAt(placed, x, y),
      };
      const built = buildLiveFields(material, clip, window.x, window.y, window.size, artboardPt, moving, sources, cached);
      if (built.fitted) gain.current = { k: built.rimK, artboardPt, material };
      const macro = upload(built.macro, LIVE_MACRO_PX);
      const rim = upload(built.rim, built.rimSide);
      if (cancel) {
        macro?.dispose();
        rim?.dispose();
        return;
      }
      setUploaded({ macro, rim, rimK: built.rimK });
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
      current.rim?.dispose();
    };
  }, [uploaded]);

  const ready = material === 'gummi' && Boolean(effect && albedo && uploaded.macro && uploaded.rim && micro.current && glint.current);
  return {
    ready,
    albedo,
    macro: uploaded.macro,
    micro: micro.current,
    glint: glint.current,
    rim: uploaded.rim,
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
  if (!effect || !field.ready || !field.albedo || !field.macro || !field.micro || !field.glint || !field.rim) return null;
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
        rimK: field.rimK,
      }}
    >
      <ImageShader image={field.albedo} fit="fill" x={rect.x} y={rect.y} width={rect.size} height={rect.size} tx="clamp" ty="clamp" />
      <ImageShader image={field.macro} fit="fill" x={rect.x} y={rect.y} width={rect.size} height={rect.size} tx="clamp" ty="clamp" />
      <ImageShader image={field.micro} fit="fill" x={rect.x} y={rect.y} width={rect.size} height={rect.size} tx="clamp" ty="clamp" />
      <ImageShader image={field.glint} fit="fill" x={rect.x} y={rect.y} width={rect.size} height={rect.size} tx="clamp" ty="clamp" />
      <ImageShader image={field.rim} fit="fill" x={rect.x} y={rect.y} width={rect.size} height={rect.size} tx="clamp" ty="clamp" />
    </Shader>
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
  const field = useLiveMaterial(material, clip, window, place.artboardPt, false, { kind: 'points', width, cx, cy });
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
