import { Skia, type SkCanvas, type SkPath, type TileMode } from '@shopify/react-native-skia';

import { S6_STONE } from '@/splash/s6';
import {
  calmAt,
  gooSigma,
  INK_RGB,
  logoPose,
  mixAt,
  MIX_OFF_AT,
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

function argb(r: number, g: number, b: number) {
  'worklet';
  const ri = Math.round(r);
  const gi = Math.round(g);
  const bi = Math.round(b);
  return ((255 << 24) | (ri << 16) | (gi << 8) | bi) | 0;
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
    paint.setColor(Skia.Color(argb(
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
    paint.setColor(Skia.Color(argb(logo.r, logo.g, logo.b)));
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
