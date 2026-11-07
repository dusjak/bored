/**
 * Live lighting fields for Expo Go.
 * The macro grid is 64² and is rebuilt when the silhouette key changes, not per frame.
 * The 1200² NumPy micro grids stay in the Node tests. They are not read here,
 * because Expo Go has no filesystem access to those grids. The shader's micro
 * sample is then zero. The silhouette macro and the rim still follow the path.
 *
 * The source rim is sampled at 3 px/pt. A full artboard at that rate is a 1200²
 * plate on the 240 pt stone, and the fourteen-step fit copies it. The device
 * grid is capped. Lengths stay in points (`pxPerPt = cols / artboardPt`); the
 * cap only coarsens the sample. While the pose is moving the cap is lower, and
 * the last fitted gain is reused so the plate is not rebuilt on the hold.
 */

import {
  RIM_BAND_MIN,
  RIM_SAMPLE_PX_PER_PT,
  fitRimGainFromBand,
  litFromBase,
  normalsFromHeight,
  rimBand,
  silhouetteMacro,
  type MaterialId,
} from './pathLight.ts';

export const LIVE_MACRO_PX = 64;
/** Rest pose. 3 px/pt where the artboard is small enough, otherwise this side. */
export const LIVE_RIM_CAP_REST = 320;
/** Hold / size spring. The band still uses point lengths; the grid is coarser. */
export const LIVE_RIM_CAP_MOVING = 160;

export type ClipLike = { contains: (x: number, y: number) => boolean };

export type LiveSources = {
  albedo: Uint8Array | null;
  albedoW: number;
  albedoH: number;
  sourceAt: (x: number, y: number) => { x: number; y: number };
};

export function rasterMask(clip: ClipLike, x0: number, y0: number, size: number, cells: number): Uint8Array {
  const mask = new Uint8Array(cells * cells);
  for (let y = 0; y < cells; y += 1) {
    for (let x = 0; x < cells; x += 1) {
      if (clip.contains(x0 + ((x + 0.5) / cells) * size, y0 + ((y + 0.5) / cells) * size)) mask[y * cells + x] = 1;
    }
  }
  return mask;
}

/** Silhouette macro only. Does not read the Node height grids. */
export function liveMacroNormals(id: MaterialId, mask: Uint8Array): Float32Array {
  const height = silhouetteMacro(mask, LIVE_MACRO_PX, LIVE_MACRO_PX, id);
  return normalsFromHeight(height, LIVE_MACRO_PX, LIVE_MACRO_PX, 1);
}

export function normalBytes(normals: Float32Array): Uint8Array {
  const count = normals.length / 3;
  const bytes = new Uint8Array(count * 4);
  for (let i = 0; i < count; i += 1) {
    bytes[i * 4] = Math.round((normals[i * 3] * 0.5 + 0.5) * 255);
    bytes[i * 4 + 1] = Math.round((normals[i * 3 + 1] * 0.5 + 0.5) * 255);
    bytes[i * 4 + 2] = Math.round((normals[i * 3 + 2] * 0.5 + 0.5) * 255);
    bytes[i * 4 + 3] = 255;
  }
  return bytes;
}

export function rimResolution(artboardPt: number, moving: boolean): { cols: number; pxPerPt: number; capped: boolean } {
  const full = Math.max(1, Math.round(artboardPt * RIM_SAMPLE_PX_PER_PT));
  const cap = moving ? LIVE_RIM_CAP_MOVING : LIVE_RIM_CAP_REST;
  const cols = Math.min(cap, full);
  return { cols, pxPerPt: cols / Math.max(artboardPt, 1e-6), capped: cols < full };
}

export function buildLiveFields(
  id: MaterialId,
  clip: ClipLike,
  x0: number,
  y0: number,
  size: number,
  artboardPt: number,
  moving: boolean,
  sources: LiveSources,
  cachedK: number | null,
): {
  macro: Uint8Array;
  rim: Uint8Array;
  rimSide: number;
  rimK: number;
  pxPerPt: number;
  capped: boolean;
  fitted: boolean;
} {
  const macroMask = rasterMask(clip, x0, y0, size, LIVE_MACRO_PX);
  const normals = liveMacroNormals(id, macroMask);
  const macro = normalBytes(normals);
  const grid = rimResolution(artboardPt, moving);
  const rimMask = rasterMask(clip, x0, y0, size, grid.cols);
  const { band, edge } = rimBand(rimMask, grid.cols, grid.cols, grid.pxPerPt);
  let rimK = 0;
  let fitted = false;
  const albedo = sources.albedo;
  const canFit = Boolean(albedo && sources.albedoW > 0 && sources.albedoH > 0 && albedo.length >= sources.albedoW * sources.albedoH * 4);
  if (!moving || cachedK == null) {
    if (canFit && albedo) {
      const plate = new Float32Array(grid.cols * grid.cols * 3);
      for (let i = 0; i < edge.length; i += 1) {
        if (!edge[i] || band[i] <= RIM_BAND_MIN) continue;
        const x = i % grid.cols;
        const y = (i - x) / grid.cols;
        const fx = (x + 0.5) / grid.cols;
        const fy = (y + 0.5) / grid.cols;
        const mx = Math.min(LIVE_MACRO_PX - 1, Math.max(0, Math.floor(fx * LIVE_MACRO_PX)));
        const my = Math.min(LIVE_MACRO_PX - 1, Math.max(0, Math.floor(fy * LIVE_MACRO_PX)));
        const n = my * LIVE_MACRO_PX + mx;
        const src = sources.sourceAt(x0 + fx * size, y0 + fy * size);
        const color = litFromBase(
          albedo,
          sources.albedoW,
          sources.albedoH,
          src.x,
          src.y,
          { x: normals[n * 3], y: normals[n * 3 + 1], z: normals[n * 3 + 2] },
          id,
        );
        plate[i * 3] = color.r;
        plate[i * 3 + 1] = color.g;
        plate[i * 3 + 2] = color.b;
      }
      rimK = fitRimGainFromBand(plate, band, edge).k;
      fitted = true;
    }
  } else {
    rimK = cachedK;
  }
  const rim = new Uint8Array(grid.cols * grid.cols * 4);
  for (let i = 0; i < band.length; i += 1) {
    rim[i * 4] = Math.round(Math.min(1, Math.max(0, band[i])) * 255);
    rim[i * 4 + 3] = 255;
  }
  return { macro, rim, rimSide: grid.cols, rimK, pxPerPt: grid.pxPerPt, capped: grid.capped, fitted };
}
