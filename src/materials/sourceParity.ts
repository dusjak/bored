/**
 * Rest-pose height in the same pixels as the 1200² masters.
 *
 * Bevel grids are `material.py` `render_object` lines 84–100 at seed 47, on
 * `build.py` `local_mask(240, mat, 'rest')`. Skifer's `noise()` calls use
 * `aniso=(0.12 D, 0.018 D, 18)` and the layer `aniso=(0.5 D, 0.03 D, 18)`.
 * Emalje uses the export overrides box=0.40, box_w=0.17, det=0.00002.
 * The bytes are that NumPy/SciPy run, stored as float16. They are not a second generator.
 *
 * Gummi normals are the hires 1 px gradient on the 2520 canvas, then the
 * `export-gummi.py` crop, Lanczos half-scale, and radial warp. They are not the
 * derivative of the warped height. Bevel normals are `numpy.gradient` of the
 * 1200 height grid. Kull glint is `material.py` lines 130–132.
 */

import { inflateSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { hash01, normalsFromHeight } from './pathLight.ts';
import { SOURCE_BASE_R, SOURCE_REST_R } from './sourceTables.ts';

export const SOURCE_MASTER = 1200;
export const SOURCE_CANVAS_CENTER = 1260;
export const SOURCE_OBJECT_D = 1440;
const STONE_WIDTH = 600;
const REST_W = 240;

const dir = dirname(fileURLToPath(import.meta.url));

function float16(bits: number): number {
  const sign = bits & 0x8000 ? -1 : 1;
  const exp = (bits >> 10) & 0x1f;
  const frac = bits & 0x3ff;
  if (exp === 0) return sign * 2 ** -14 * (frac / 1024);
  if (exp === 31) return frac ? Number.NaN : sign * Number.POSITIVE_INFINITY;
  return sign * 2 ** (exp - 15) * (1 + frac / 1024);
}

function loadF16(file: string, width: number, height: number): Float32Array {
  const raw = inflateSync(readFileSync(join(dir, 'source', file)));
  if (raw.length !== width * height * 2) {
    throw new Error(`${file} is ${raw.length} bytes, expected ${width * height * 2}`);
  }
  const out = new Float32Array(width * height);
  for (let i = 0; i < out.length; i += 1) out[i] = float16(raw[i * 2] | (raw[i * 2 + 1] << 8));
  return out;
}

const grids = new Map<string, Float32Array>();

function grid(file: string, width: number, height: number): Float32Array {
  const hit = grids.get(file);
  if (hit) return hit;
  const loaded = loadF16(file, width, height);
  grids.set(file, loaded);
  return loaded;
}

function bilinear(values: Float32Array, width: number, height: number, x: number, y: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = x - x0;
  const ty = y - y0;
  const at = (ix: number, iy: number) => {
    const xx = Math.min(width - 1, Math.max(0, ix));
    const yy = Math.min(height - 1, Math.max(0, iy));
    return values[yy * width + xx];
  };
  const a = at(x0, y0);
  const b = at(x0 + 1, y0);
  const c = at(x0, y0 + 1);
  const d = at(x0 + 1, y0 + 1);
  return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
}

function interpClosed(angle: number, theta: Float64Array, values: Float64Array): number {
  const count = theta.length;
  let a = angle;
  if (a < theta[0]) a = theta[0];
  if (a > Math.PI) a = Math.PI;
  let i = 1;
  while (i < count && theta[i] < a) i += 1;
  const prev = i >= count ? count - 1 : i - 1;
  const t1 = i >= count ? Math.PI : theta[i];
  const v1 = i >= count ? values[0] : values[i];
  const span = t1 - theta[prev];
  const t = span === 0 ? 0 : (a - theta[prev]) / span;
  return values[prev] * (1 - t) + v1 * t;
}

const THETA = (() => {
  const theta = new Float64Array(720);
  const step = (2 * Math.PI) / 720;
  for (let i = 0; i < 720; i += 1) theta[i] = -Math.PI + i * step;
  return theta;
})();

/** Output pixel on the 1200 canvas → sample in the unwarped crop, `export-gummi.py` lines 36–39. */
export function masterWarp(px: number, py: number, w = REST_W): { sx: number; sy: number; rat: number; xx: number; yy: number } {
  const xx = px / 3 - 200;
  const yy = py / 3 - 200;
  const ang = Math.atan2(yy, xx);
  const br = interpClosed(ang, THETA, SOURCE_BASE_R) * w;
  const target = interpClosed(ang, THETA, SOURCE_REST_R);
  const rat = br / Math.max(target, 0.001);
  return { sx: (xx * rat + 0.5 * w) * 3, sy: (yy * rat + 0.423 * w) * 3, rat, xx, yy };
}

/** Same pixel → `shape_mask` coordinate. 600 mask px correspond to `w` points. */
export function masterToStone(px: number, py: number, w = REST_W): { x: number; y: number } {
  const warp = masterWarp(px, py, w);
  const scale = STONE_WIDTH / w;
  return { x: 400 + warp.xx * warp.rat * scale, y: 400 + warp.yy * warp.rat * scale };
}

/** Unwarped crop pixel → 2520 canvas. Crop is half of the @6x frame; center is (360, 0.423 w · 3). */
export function masterToCanvas(px: number, py: number, w = REST_W): { x: number; y: number } {
  const warp = masterWarp(px, py, w);
  const cx = 0.5 * w * 3;
  const cy = 0.423 * w * 3;
  return { x: SOURCE_CANVAS_CENTER + (warp.sx - cx) * 2, y: SOURCE_CANVAS_CENTER + (warp.sy - cy) * 2 };
}

/** `hires.py` `vnoise`, lines 18–25. */
export function sourceVnoise(x: number, y: number, cell: number, seed: number, rot: number): number {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const px = (x * c - y * s) / cell;
  const py = (x * s + y * c) / cell;
  const ix = Math.floor(px);
  const iy = Math.floor(py);
  const fx = px - ix;
  const fy = py - iy;
  const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
  const uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const a = hash01(ix, iy, seed);
  const b = hash01(ix + 1, iy, seed);
  const cc = hash01(ix, iy + 1, seed);
  const d = hash01(ix + 1, iy + 1, seed);
  const v = (a + (b - a) * ux) * (1 - uy) + (cc + (d - cc) * ux) * uy;
  return (v * 2 - 1) * 1.7;
}

/** `hires.py` `fbm`, lines 27–32. */
export function sourceFbm(x: number, y: number, cells: readonly number[], amps: readonly number[], seed: number): number {
  let out = 0;
  for (let i = 0; i < cells.length; i += 1) {
    const cell = cells[i];
    if (cell < 1.3) continue;
    out += amps[i] * sourceVnoise(x, y, cell, seed + 17 * i, 0.7 * i + 0.3);
  }
  return out;
}

const HEIGHT_FILE: Record<string, string> = {
  gummi: 'height-gummi.f16.zlib',
  skifer: 'height-skifer.f16.zlib',
  kull: 'height-kull.f16.zlib',
  emalje: 'height-emalje.f16.zlib',
  floyel: 'height-floyel.f16.zlib',
};

const normalCache = new Map<string, Float32Array>();

/**
 * Height at a master pixel, 1:1 with the 1200² grid. Gummi is the hires pillow
 * after the export-gummi.py warp. Differentiating that warped height is not the
 * source normal: the canvas gradient is warped as its own field.
 */
export function masterHeightAt(id: string, px: number, py: number): number {
  const file = HEIGHT_FILE[id];
  if (!file) return 0;
  return bilinear(grid(file, SOURCE_MASTER, SOURCE_MASTER), SOURCE_MASTER, SOURCE_MASTER, px, py);
}

/** 1 px source normals for the whole master. Cached. */
export function masterNormals(id: string): Float32Array {
  const hit = normalCache.get(id);
  if (hit) return hit;
  let normals: Float32Array;
  if (id === 'gummi') {
    const xy = loadF16('normal-gummi-xy.f16.zlib', SOURCE_MASTER * 2, SOURCE_MASTER);
    normals = new Float32Array(SOURCE_MASTER * SOURCE_MASTER * 3);
    const count = SOURCE_MASTER * SOURCE_MASTER;
    for (let i = 0; i < count; i += 1) {
      const x = xy[i * 2];
      const y = xy[i * 2 + 1];
      const z2 = 1 - x * x - y * y;
      normals[i * 3] = x;
      normals[i * 3 + 1] = y;
      normals[i * 3 + 2] = z2 > 0 ? Math.sqrt(z2) : 0;
    }
  } else {
    const file = HEIGHT_FILE[id];
    if (!file) throw new Error(`no source height for ${id}`);
    normals = normalsFromHeight(grid(file, SOURCE_MASTER, SOURCE_MASTER), SOURCE_MASTER, SOURCE_MASTER, 1);
  }
  normalCache.set(id, normals);
  return normals;
}

/** Blurred Kull glint mask, `material.py` lines 130–132, seed 58. Zero for other materials. */
export function masterGlintAt(id: string, px: number, py: number): number {
  if (id !== 'kull') return 0;
  return bilinear(grid('glint-kull.f16.zlib', SOURCE_MASTER, SOURCE_MASTER), SOURCE_MASTER, SOURCE_MASTER, px, py);
}
