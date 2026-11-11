import {
  FilterMode,
  MipmapMode,
  Skia,
  TileMode,
  type SkCanvas,
  type SkImage,
  type SkPath,
  type SkPicture,
  type SkRuntimeEffect,
} from '@shopify/react-native-skia';

import { S6_STONE } from '@/splash/s6';
import {
  calmAt,
  gooSigma,
  INK_RGB,
  logoPose,
  mixAt,
  MIX_OFF_AT,
  mixShaderUnits,
  modelTime,
  outlinePhase,
  type LogoPose,
  type Stimulus,
  sampleStimulus,
  swallowRadius,
  wobbleAt,
  writeOutline,
} from '@/splash/sluket';

const GOO = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 18, -7];

export type SplashDraw = {
  logo: LogoPose;
  sigma: number;
  mixM: number;
  mixR: number;
};

/** CSS colour. Skia.Color accepts this on the JS thread; a packed int does not travel. */
function inkCss(r: number, g: number, b: number) {
  'worklet';
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

/**
 * One picture of every pebble, and the logo pose for this frame.
 * Outlines are the baked pebbles. Only the transform and the ink change.
 * The dot is drawn into the picture while the mix is on, so the colours
 * swallow it; the sharp dot is a separate vector on top.
 */
export function renderBlobs(
  canvas: SkCanvas,
  stimuli: readonly Stimulus[],
  tMs: number,
  width: number,
  height: number,
  limit: number,
  colorMix: number,
  stone: SkPath | null,
): SplashDraw {
  'worklet';
  const model = modelTime(tMs);
  const calmE = calmAt(tMs);
  const swallowR = swallowRadius(tMs);
  const amp = wobbleAt(model);
  const mixOn = colorMix === 1 && tMs < MIX_OFF_AT ? 1 : 0;
  const n = Math.min(limit, stimuli.length);
  let swallowed = 0;
  let ar = 0;
  let ag = 0;
  let ab = 0;
  let aw = 0;
  const sigmaNow = gooSigma(model);
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  const builder = Skia.PathBuilder.Make();
  const blurLayer = mixOn === 0 && sigmaNow > 0.05;
  if (blurLayer) {
    const layer = Skia.Paint();
    const blur = Skia.ImageFilter.MakeBlur(sigmaNow, sigmaNow, 0 as TileMode, null);
    const filter = Skia.ImageFilter.MakeColorFilter(Skia.ColorFilter.MakeMatrix(GOO), blur);
    layer.setImageFilter(filter);
    canvas.saveLayer(layer);
  }
  for (let i = 0; i < n; i += 1) {
    const item = stimuli[i]!;
    const pose = sampleStimulus(
      i,
      item.delay,
      item.angle,
      item.r0,
      item.size,
      item.rot0,
      item.flake,
      item.turnU,
      item.shift,
      model,
      width,
      height,
      limit,
      swallowR,
      calmE,
    );
    if (pose[1] === 1) {
      swallowed += 1;
      ar += item.rgb[0] * item.size;
      ag += item.rgb[1] * item.size;
      ab += item.rgb[2] * item.size;
      aw += item.size;
      continue;
    }
    if (pose[0] !== 1 || pose[8] < 0.3) continue;
    const k = pose[9];
    builder.reset();
    writeOutline(builder, item.outline, amp, outlinePhase(model, item.phase));
    paint.setColor(Skia.Color(inkCss(
      item.rgb[0] + (INK_RGB[0] - item.rgb[0]) * k,
      item.rgb[1] + (INK_RGB[1] - item.rgb[1]) * k,
      item.rgb[2] + (INK_RGB[2] - item.rgb[2]) * k,
    )));
    canvas.save();
    canvas.translate(pose[2], pose[3]);
    canvas.rotate((pose[4] * 180) / Math.PI, 0, 0);
    canvas.scale(pose[5], pose[6]);
    canvas.rotate(((pose[7] - pose[4]) * 180) / Math.PI, 0, 0);
    canvas.scale(pose[8], pose[8]);
    canvas.drawPath(builder.detach(), paint);
    canvas.restore();
  }
  if (blurLayer) canvas.restore();

  const fraction = n > 0 ? swallowed / n : 1;
  const avg = aw > 0 ? ([ar / aw, ag / aw, ab / aw] as const) : INK_RGB;
  const logo = logoPose(tMs, fraction, avg, mixOn === 1);
  if (mixOn === 1 && stone && logo.kw > 0.2) {
    paint.setColor(Skia.Color(inkCss(logo.r, logo.g, logo.b)));
    canvas.save();
    canvas.translate(width / 2 + logo.dx, height / 2 + logo.dy);
    canvas.scale(logo.kw, logo.kw);
    canvas.drawPath(stone, paint);
    canvas.restore();
  }
  const mix = mixAt(tMs);
  return { logo, sigma: gooSigma(model), mixM: mix.m, mixR: mix.radius };
}

export function makeStonePath() {
  'worklet';
  return Skia.Path.MakeFromSVGString(S6_STONE);
}

export type SplashPlate =
  | { kind: 'image'; image: SkImage; under: SkImage | null }
  | { kind: 'picture'; picture: SkPicture };

/**
 * Raster of one swallow frame, owned by the JS thread.
 * The plate is one CPU pixel per device pixel (`width * pixelRatio`). A 4 pt
 * cell stretched to the screen was the grain: each pebble became a block.
 * `Surface.Make` stays a CPU image. A GPU offscreen surface belongs to the
 * calling thread's Metal context, and the canvas draws on the UI thread, so
 * that image never appears.
 * The two surfaces are kept and cleared. A fresh full-retina allocation every
 * frame is the expensive part, not the draw.
 * Not a UI-runtime function: iOS drops pictures created off the JS thread.
 */
type Raster = NonNullable<ReturnType<typeof Skia.Surface.Make>>;
const rasterCache: { w: number; h: number; surface: Raster }[] = [];

function rasterSurface(width: number, height: number, slot: number): Raster | null {
  const cached = rasterCache[slot];
  if (cached && cached.w === width && cached.h === height) return cached.surface;
  const surface = Skia.Surface.Make(width, height);
  if (!surface) return null;
  rasterCache[slot] = { w: width, h: height, surface };
  return surface;
}

export function presentSplash(input: {
  picture: SkPicture;
  width: number;
  height: number;
  /** Device pixels per point. 1 keeps the old point-sized plate. */
  pixelRatio: number;
  /** Null skips the paint mix. The picture's own ink is enough. */
  mix: { m: number; radius: number; sigma: number } | null;
  effect: SkRuntimeEffect | null;
}): SplashPlate {
  const ratio = Math.max(1, input.pixelRatio);
  const bufW = Math.max(1, Math.round(input.width * ratio));
  const bufH = Math.max(1, Math.round(input.height * ratio));
  const surface = rasterSurface(bufW, bufH, 0);
  if (!surface) return { kind: 'picture', picture: input.picture };
  const canvas = surface.getCanvas();
  canvas.clear(Skia.Color('rgba(0,0,0,0)'));
  canvas.save();
  canvas.scale(bufW / input.width, bufH / input.height);
  canvas.drawPicture(input.picture);
  canvas.restore();
  const base = surface.makeImageSnapshot();
  if (!input.mix || !input.effect) return { kind: 'image', image: base, under: null };
  try {
    const shaderCell = 1 / ratio;
    const child = base.makeShaderOptions(TileMode.Clamp, TileMode.Clamp, FilterMode.Linear, MipmapMode.None);
    const shader = input.effect.makeShaderWithChildren(
      [input.mix.m, mixShaderUnits(input.mix.radius, shaderCell), mixShaderUnits(input.mix.sigma, shaderCell)],
      [child],
    );
    const mixed = rasterSurface(bufW, bufH, 1);
    if (!mixed) return { kind: 'image', image: base, under: null };
    const paint = Skia.Paint();
    paint.setShader(shader);
    const mixCanvas = mixed.getCanvas();
    mixCanvas.clear(Skia.Color('rgba(0,0,0,0)'));
    mixCanvas.drawPaint(paint);
    return { kind: 'image', image: mixed.makeImageSnapshot(), under: base };
  } catch {
    return { kind: 'image', image: base, under: null };
  }
}
