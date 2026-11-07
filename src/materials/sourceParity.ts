/**
 * Rest-pose height in the same pixels as the 1200² masters.
 *
 * Bevel grids are `material.py` `render_object` lines 84–100 at seed 47, on
 * `build.py` `local_mask(240, mat, 'rest')`. Skifer's `noise()` calls use
 * `aniso=(0.12 D, 0.018 D, 18)` and the layer `aniso=(0.5 D, 0.03 D, 18)`.
 * Emalje uses the export overrides box=0.40, box_w=0.17, det=0.00002.
 * The bytes are that NumPy/SciPy run, stored as float16. They are not a second generator.
 *
 * Gummi is the hires pillow (`hires.py` lines 145–153) on `shape_mask(600, 400, 400, 800, 800)`,
 * then placed with the `export-gummi.py` lines 36–39 warp. Detail fbm uses the hash in
 * `hires.py` lines 12–32, seed 7, at the 2520 canvas (`CX=CY=1260`, `OW=1440`).
 * Distances on the 800 mask are scaled by 1440/600, the ratio of those two widths.
 */

import { inflateSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { hash01, pillowHeight, spotsAt } from './pathLight.ts';
import { SOURCE_BASE_R, SOURCE_REST_R } from './sourceTables.ts';

export const SOURCE_MASTER = 1200;
export const SOURCE_STONE = 800;
export const SOURCE_CANVAS_CENTER = 1260;
export const SOURCE_OBJECT_D = 1440;
const STONE_WIDTH = 600;
const REST_W = 240;
const MASK_PER_CANVAS = SOURCE_OBJECT_D / STONE_WIDTH;

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

function gummiDetail(x: number, y: number): number {
  const d = SOURCE_OBJECT_D;
  const und = sourceFbm(x, y, [0.12 * d], [0.0004], 8);
  const grain = sourceFbm(x, y, [0.0022 * d, 0.0011 * d, 0.00055 * d], [8.8e-5, 5.6e-5, 3.2e-5], 9);
  const pit = spotsAt(x, y, 0.03 * d, 0.06, 0.0006 * d, 0.0014 * d, 10);
  return und + grain - pit ** 0.7 * 0.0004 * d;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const span = edge1 - edge0;
  if (span === 0) return x < edge0 ? 0 : 1;
  const t = Math.min(1, Math.max(0, (x - edge0) / span));
  return t * t * (3 - 2 * t);
}

let stoneRadius = 0;

function stoneFields(): { phi: Float32Array; dist: Float32Array; radius: number } {
  const phi = grid('stone-phi.f16.zlib', SOURCE_STONE, SOURCE_STONE);
  const dist = grid('stone-dist.f16.zlib', SOURCE_STONE, SOURCE_STONE);
  if (stoneRadius === 0) {
    for (let i = 0; i < dist.length; i += 1) if (dist[i] > stoneRadius) stoneRadius = dist[i];
  }
  return { phi, dist, radius: stoneRadius };
}

const BEVEL_HEIGHT: Record<string, string> = {
  skifer: 'height-skifer.f16.zlib',
  kull: 'height-kull.f16.zlib',
  emalje: 'height-emalje.f16.zlib',
  floyel: 'height-floyel.f16.zlib',
};

/**
 * Height at a master pixel. Bevel materials read the NumPy grid, which already
 * includes the 18° Skifer noise. Gummi evaluates the pillow in canvas units and
 * adds the hash detail at the pre-warp coordinate.
 */
export function masterHeightAt(id: string, px: number, py: number): number {
  const file = BEVEL_HEIGHT[id];
  if (file) return bilinear(grid(file, SOURCE_MASTER, SOURCE_MASTER), SOURCE_MASTER, SOURCE_MASTER, px, py);
  if (id !== 'gummi') return 0;
  const stone = masterToStone(px, py);
  const fields = stoneFields();
  const distMask = bilinear(fields.dist, SOURCE_STONE, SOURCE_STONE, stone.x, stone.y);
  const phi = bilinear(fields.phi, SOURCE_STONE, SOURCE_STONE, stone.x, stone.y);
  const dist = distMask * MASK_PER_CANVAS;
  const radius = fields.radius * MASK_PER_CANVAS;
  const macro = pillowHeight(dist, radius, phi, 0.4, 2.4);
  const canvas = masterToCanvas(px, py);
  const ramp = smoothstep(0, 0.004 * SOURCE_OBJECT_D, dist);
  return macro + gummiDetail(canvas.x, canvas.y) * ramp;
}
