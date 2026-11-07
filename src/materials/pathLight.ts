/**
 * Path-dependent height and light. Rest shade/light maps are not samples.
 *
 * Gummi is the hires pillow (`hires.py` HR['gummi']), not `MATERIALS['gummi']`.
 * φ is the normalized solution of ∇²u = -1 inside the mask and u = 0 outside
 * (`hires.py` `poisson_phi`, lines 67–78). A local bevel SDF is not this φ.
 * The four other materials keep `material.py` `render_object` lines 84–103 and 111–126.
 * Emalje uses the export overrides box=0.40, box_w=0.17, det=0.00002.
 *
 * Gummi height is the hires pillow plus hash fbm, sampled through the radial warp
 * (`export-gummi.py` lines 36–39) so it sits in the same canvas as `base.png`.
 * Skifer, Kull, Emalje, and Fløyel use the NumPy height grid from `material.py`
 * `noise()`, including Skifer's 18° `ndi.rotate`. Those grids are the source run,
 * not a second generator. `base.png` stays the albedo.
 */

import { SOURCE_BASE_R, SOURCE_REST_R } from './sourceTables.ts';

export const ENV_LIGHT = {
  /** `material.py` line 68. Not a unit vector yet. */
  L: [-0.42, -0.62, 0.66] as const,
  key: 0.75,
  amb: 0.35,
  rim: 0,
  floor: '#F0EDE7',
} as const;

/** `hires.py` line 27. Cells smaller than this are dropped. */
export const FBM_MIN_CELL = 1.3;

/** Source object width the grain override was measured on. JSON `OW`. */
export const GUMMI_SOURCE_D = 1440;

/** `hires.py` line 82: the proxy grid is at most this many pixels on a side. */
export const POISSON_PROXY_MAX = 700;

export const MATERIAL_IDS = ['gummi', 'skifer', 'kull', 'emalje', 'floyel'] as const;
export type MaterialId = (typeof MATERIAL_IDS)[number];

export type Vec3 = { x: number; y: number; z: number };
export type RGB = { r: number; g: number; b: number };

type BevelProfile = {
  kind: 'bevel';
  albedo: string;
  bevel: number;
  hs: number;
  crown: number;
  /** `material.py` line 100. Not used on the pillow. */
  heightBlur: 0.6;
  kd: number;
  spec: number;
  pow: number;
  f0: number;
  box: number;
  boxW: number;
  sheen: number;
  sheenExp: number;
  /** `material.py` line 125 default. Not a JSON field. */
  floorRefl: 0.55;
  speck: number;
  speckS: number;
  det: number;
  detS: number;
  det2: number;
  det2S: number;
  layers: number;
  /** sx, sy as fractions of D, then degrees. Skifer is 18. Not applied to height. */
  aniso: readonly [number, number, number] | null;
  glint: number;
  /** `export.py` calls `render_object` with seed 47. */
  seed: 47;
  /** Height does not add `noise()`. The generator below is not NumPy PCG64. */
  noiseMatchesNumpy: false;
};

type PillowProfile = {
  kind: 'pillow';
  albedo: string;
  hs: 0.4;
  flat: 2.4;
  kd: 1;
  spec: 0.07;
  pow: 2.6;
  f0: 0.03;
  refl: 0.4;
  envRefl: 0.12;
  sheen: 0.04;
  /** hires line 176 hard-codes the exponent. There is no sheen_exp on this profile. */
  sheenExp: 1.5;
  box: 0;
  rim: 0;
  /** JSON amplitudes, not the HR defaults 0.000022 / 0.000014 / 0.000008. */
  grainAmp: readonly [number, number, number];
  grainCell: readonly [number, number, number];
  undAmp: readonly [number];
  undCell: readonly [number];
  albVarAmp: readonly [number, number];
  albVarCell: readonly [number, number];
  /** Detail is computed in source-D coordinates. It is not composited onto base.png. */
  detailAppliedOnBase: false;
};

export type MaterialProfile = BevelProfile | PillowProfile;

export const PROFILES: Record<MaterialId, MaterialProfile> = {
  gummi: {
    kind: 'pillow',
    albedo: '#1A1A19',
    hs: 0.4,
    flat: 2.4,
    kd: 1,
    spec: 0.07,
    pow: 2.6,
    f0: 0.03,
    refl: 0.4,
    envRefl: 0.12,
    sheen: 0.04,
    sheenExp: 1.5,
    box: 0,
    rim: 0,
    grainCell: [0.0022, 0.0011, 0.00055],
    grainAmp: [8.8e-5, 5.6e-5, 3.2e-5],
    undCell: [0.12],
    undAmp: [0.0004],
    albVarCell: [0.02, 0.003],
    albVarAmp: [0.03, 0.035],
    detailAppliedOnBase: false,
  },
  skifer: {
    kind: 'bevel',
    albedo: '#1C1D1D',
    bevel: 0.16,
    hs: 0.35,
    crown: 0,
    heightBlur: 0.6,
    kd: 1,
    spec: 0.1,
    pow: 9,
    f0: 0.03,
    box: 0,
    boxW: 0,
    sheen: 0,
    sheenExp: 1,
    floorRefl: 0.55,
    speck: 0.1,
    speckS: 0.004,
    det: 0.004,
    detS: 0.01,
    det2: 0.0015,
    det2S: 0.006,
    layers: 0.1,
    aniso: [0.12, 0.018, 18],
    glint: 0,
    seed: 47,
    noiseMatchesNumpy: false,
  },
  kull: {
    kind: 'bevel',
    albedo: '#141312',
    bevel: 0.5,
    hs: 0.55,
    crown: 0.05,
    heightBlur: 0.6,
    kd: 1,
    spec: 0.02,
    pow: 4,
    f0: 0.01,
    box: 0,
    boxW: 0,
    sheen: 0,
    sheenExp: 1,
    floorRefl: 0.55,
    speck: 0.2,
    speckS: 0.006,
    det: 0.006,
    detS: 0.008,
    det2: 0.002,
    det2S: 0.003,
    layers: 0,
    aniso: null,
    glint: 0.0008,
    seed: 47,
    noiseMatchesNumpy: false,
  },
  emalje: {
    kind: 'bevel',
    albedo: '#111110',
    bevel: 0.4,
    hs: 0.55,
    crown: 0.06,
    heightBlur: 0.6,
    kd: 1,
    spec: 0,
    pow: 40,
    f0: 0.045,
    box: 0.4,
    boxW: 0.17,
    sheen: 0,
    sheenExp: 1,
    floorRefl: 0.55,
    speck: 0,
    speckS: 0.01,
    det: 0.00002,
    detS: 0.02,
    det2: 0,
    det2S: 0,
    layers: 0,
    aniso: null,
    glint: 0,
    seed: 47,
    noiseMatchesNumpy: false,
  },
  floyel: {
    kind: 'bevel',
    albedo: '#141313',
    bevel: 0.85,
    hs: 0.45,
    crown: 0,
    heightBlur: 0.6,
    kd: 0.5,
    spec: 0,
    pow: 2,
    f0: 0,
    box: 0,
    boxW: 0,
    sheen: 1,
    sheenExp: 1.2,
    floorRefl: 0.55,
    speck: 0.05,
    speckS: 0.002,
    det: 0.0015,
    detS: 0.0016,
    det2: 0,
    det2S: 0,
    layers: 0,
    aniso: null,
    glint: 0,
    seed: 47,
    noiseMatchesNumpy: false,
  },
};

/** HR defaults that the JSON export replaced. Tests pin that we do not use them. */
export const GUMMI_HR_GRAIN_AMP_SUPERSEDED = [0.000022, 0.000014, 0.000008] as const;
export const GUMMI_HR_ALB_VAR_AMP_SUPERSEDED = [0.025, 0.02] as const;

export function unitLight(): Vec3 {
  const [x, y, z] = ENV_LIGHT.L;
  const n = Math.hypot(x, y, z);
  return { x: x / n, y: y / n, z: z / n };
}

export function parseHex(hex: string): RGB {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function clamp01(v: number): number {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

/** Continuous disk solution of ∇²u = -k, u(r)=0, after normalizing the center to 1. */
export function analyticDiskPhi(rho: number, radius: number): number {
  if (radius <= 0 || rho >= radius) return 0;
  return 1 - (rho / radius) ** 2;
}

/**
 * Pillow macro height. `hires.py` lines 145–147.
 * dist and R are the same unit. φ is the normalized Poisson field, not dist/R.
 */
export function pillowHeight(dist: number, radius: number, phi: number, hs = 0.4, flat = 2.4): number {
  if (radius <= 0) return 0;
  const te = clamp01(phi / 0.6);
  const ph = clamp01(phi);
  const e = clamp01(dist / (0.1 * radius));
  const ed = Math.sqrt(e * (2 - e));
  const dome = 0.75 * Math.sqrt(1 - (1 - te) ** 2) + 0.25 * (1 - (1 - ph) ** flat);
  return hs * radius * dome * ed;
}

/** `material.py` lines 84–86. Meniscus is not used by these four. */
export function bevelHeight(dist: number, radius: number, bevel: number, hs: number, crown: number): number {
  if (radius <= 0) return 0;
  const bev = bevel * radius;
  const t = bev <= 0 ? 1 : clamp01(dist / bev);
  const prof = Math.sqrt(1 - (1 - t) ** 2);
  const crownT = clamp01(dist / radius) ** 1.5;
  return prof * bev * hs + crown * radius * crownT;
}

/** Squared Euclidean distance to the nearest 0, for pixels that are 1. */
export function insideDistance(mask: Uint8Array, width: number, height: number): Float32Array {
  const inf = 1e20;
  const grid = new Float64Array(width * height);
  for (let i = 0; i < grid.length; i += 1) grid[i] = mask[i] ? inf : 0;
  const tmp = new Float64Array(width * height);
  for (let y = 0; y < height; y += 1) {
    const row = edt1(grid.subarray(y * width, y * width + width));
    tmp.set(row, y * width);
  }
  const out = new Float32Array(width * height);
  const col = new Float64Array(height);
  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < height; y += 1) col[y] = tmp[y * width + x];
    const dist = edt1(col);
    for (let y = 0; y < height; y += 1) {
      const v = dist[y];
      out[y * width + x] = v >= inf / 4 ? 0 : Math.sqrt(v);
    }
  }
  return out;
}

function edt1(f: Float64Array): Float64Array {
  const n = f.length;
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  let k = 0;
  v[0] = 0;
  z[0] = -Infinity;
  z[1] = Infinity;
  for (let q = 1; q < n; q += 1) {
    let s = sep(f, q, v[k]);
    while (s <= z[k]) {
      k -= 1;
      s = sep(f, q, v[k]);
    }
    k += 1;
    v[k] = q;
    z[k] = s;
    z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q += 1) {
    while (z[k + 1] < q) k += 1;
    const dx = q - v[k];
    d[q] = dx * dx + f[v[k]];
  }
  return d;
}

function sep(f: Float64Array, q: number, vk: number): number {
  return (f[q] + q * q - (f[vk] + vk * vk)) / (2 * q - 2 * vk);
}

/**
 * Jacobi form of the source update, one grid.
 * `u = mask * (average of four neighbors + 0.25)` is ∇²u = -1 (`hires.py` line 77).
 */
export function poissonJacobi(mask: Uint8Array, width: number, height: number, iterations: number): Float32Array {
  const u = new Float32Array(width * height);
  const next = new Float32Array(width * height);
  for (let iter = 0; iter < iterations; iter += 1) {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const i = y * width + x;
        if (!mask[i]) {
          next[i] = 0;
          continue;
        }
        const up = y > 0 ? u[i - width] : 0;
        const down = y + 1 < height ? u[i + width] : 0;
        const left = x > 0 ? u[i - 1] : 0;
        const right = x + 1 < width ? u[i + 1] : 0;
        next[i] = 0.25 * (up + down + left + right + 1);
      }
    }
    u.set(next);
  }
  return normalize(u);
}

function normalize(u: Float32Array): Float32Array {
  let max = 0;
  for (let i = 0; i < u.length; i += 1) if (u[i] > max) max = u[i];
  if (max <= 0) return u;
  for (let i = 0; i < u.length; i += 1) u[i] /= max;
  return u;
}

function downsampleMask(mask: Uint8Array, width: number, height: number): { mask: Uint8Array; width: number; height: number } {
  const w = Math.max(1, Math.floor(width / 2));
  const h = Math.max(1, Math.floor(height / 2));
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let acc = 0;
      let n = 0;
      for (let yy = y * 2; yy < Math.min(height, y * 2 + 2); yy += 1) {
        for (let xx = x * 2; xx < Math.min(width, x * 2 + 2); xx += 1) {
          acc += mask[yy * width + xx];
          n += 1;
        }
      }
      out[y * w + x] = acc / n > 0.5 ? 1 : 0;
    }
  }
  return { mask: out, width: w, height: h };
}

/** Catmull-Rom sample. The source upsample is `ndi.zoom(..., order=3)`. */
function cubicSample(src: Float32Array, sw: number, sh: number, x: number, y: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = x - x0;
  const ty = y - y0;
  const row = (iy: number) => {
    const yy = Math.min(sh - 1, Math.max(0, iy));
    const at = (ix: number) => src[yy * sw + Math.min(sw - 1, Math.max(0, ix))];
    const p0 = at(x0 - 1);
    const p1 = at(x0);
    const p2 = at(x0 + 1);
    const p3 = at(x0 + 2);
    return catmull(p0, p1, p2, p3, tx);
  };
  return catmull(row(y0 - 1), row(y0), row(y0 + 1), row(y0 + 2), ty);
}

function catmull(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

function upsampleValue(src: Float32Array, sw: number, sh: number, dw: number, dh: number): Float32Array {
  const out = new Float32Array(dw * dh);
  for (let y = 0; y < dh; y += 1) {
    for (let x = 0; x < dw; x += 1) {
      const sx = ((x + 0.5) * sw) / dw - 0.5;
      const sy = ((y + 0.5) * sh) / dh - 0.5;
      out[y * dw + x] = cubicSample(src, sw, sh, sx, sy) * 4;
    }
  }
  return out;
}

/** Separable Gaussian. Pillow φ uses sigma 1. Bevel height uses sigma 0.6. Pillow height does not. */
function gaussKernel(sigma: number): { radius: number; kernel: Float64Array } {
  const radius = Math.max(1, Math.ceil(sigma * 3));
  const kernel = new Float64Array(radius * 2 + 1);
  let sum = 0;
  for (let i = -radius; i <= radius; i += 1) {
    const w = Math.exp(-0.5 * (i / sigma) * (i / sigma));
    kernel[i + radius] = w;
    sum += w;
  }
  for (let i = 0; i < kernel.length; i += 1) kernel[i] /= sum;
  return { radius, kernel };
}

export function gaussianBlur(src: Float32Array, width: number, height: number, sigmaX: number, sigmaY = sigmaX): Float32Array {
  const kx = gaussKernel(Math.max(sigmaX, 0.5));
  const ky = gaussKernel(Math.max(sigmaY, 0.5));
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let acc = 0;
      for (let k = -kx.radius; k <= kx.radius; k += 1) {
        const xx = Math.min(width - 1, Math.max(0, x + k));
        acc += src[y * width + xx] * kx.kernel[k + kx.radius];
      }
      tmp[y * width + x] = acc;
    }
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let acc = 0;
      for (let k = -ky.radius; k <= ky.radius; k += 1) {
        const yy = Math.min(height - 1, Math.max(0, y + k));
        acc += tmp[yy * width + x] * ky.kernel[k + ky.radius];
      }
      out[y * width + x] = acc;
    }
  }
  return out;
}

/** Not NumPy PCG64. `material.py` `noise()` (lines 11–18) divided by its own std. */
export const NOISE_GENERATOR = 'splitmix32-box-muller-not-numpy-pcg64' as const;

function splitmix(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x9e3779b9) >>> 0;
    let z = state;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
    return ((z ^ (z >>> 16)) >>> 0) / 4294967296;
  };
}

export function materialNoise(
  width: number,
  rows: number,
  sigma: number,
  seed: number,
  aniso?: readonly [number, number, number] | null,
): Float32Array {
  const rng = splitmix(seed);
  const raw = new Float32Array(width * rows);
  for (let i = 0; i < raw.length; i += 2) {
    const u = Math.max(1e-8, rng());
    const v = rng();
    const mag = Math.sqrt(-2 * Math.log(u));
    const ang = Math.PI * 2 * v;
    raw[i] = mag * Math.cos(ang);
    if (i + 1 < raw.length) raw[i + 1] = mag * Math.sin(ang);
  }
  const sigmaX = aniso ? Math.max(aniso[0], 0.5) : Math.max(sigma, 0.5);
  const sigmaY = aniso ? Math.max(aniso[1], 0.5) : Math.max(sigma, 0.5);
  const turned = aniso ? rotateWrap(raw, width, rows, aniso[2]) : raw;
  const blurred = gaussianBlur(turned, width, rows, sigmaX, sigmaY);
  const restored = aniso ? rotateWrap(blurred, width, rows, -aniso[2]) : blurred;
  let mean = 0;
  for (let i = 0; i < restored.length; i += 1) mean += restored[i];
  mean /= restored.length;
  let varSum = 0;
  for (let i = 0; i < restored.length; i += 1) {
    const d = restored[i] - mean;
    varSum += d * d;
  }
  const std = Math.sqrt(varSum / restored.length) + 1e-6;
  for (let i = 0; i < restored.length; i += 1) restored[i] /= std;
  return restored;
}

/** Wrap rotation about the center. Geometry only; not SciPy's cubic `ndi.rotate`. */
export function rotateWrap(src: Float32Array, width: number, height: number, degrees: number): Float32Array {
  const rad = (degrees * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  const out = new Float32Array(src.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const sx = c * dx + s * dy + cx;
      const sy = -s * dx + c * dy + cy;
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const tx = sx - x0;
      const ty = sy - y0;
      const sample = (ix: number, iy: number) => {
        const xx = ((ix % width) + width) % width;
        const yy = ((iy % height) + height) % height;
        return src[yy * width + xx];
      };
      const v =
        sample(x0, y0) * (1 - tx) * (1 - ty) +
        sample(x0 + 1, y0) * tx * (1 - ty) +
        sample(x0, y0 + 1) * (1 - tx) * ty +
        sample(x0 + 1, y0 + 1) * tx * ty;
      out[y * width + x] = v;
    }
  }
  return out;
}

export type BevelDetail = {
  height: Float32Array;
  speck: Float32Array;
  glint: Float32Array;
  /** `rotateWrap` knows the 18°. Height does not call it. */
  anisoApplied: false;
  noiseMatchesNumpy: false;
};

/** `material.py` lines 87–99 and 106–131. Height blur of 0.6 is applied by the caller, after this. */
export function bevelMicrodetail(
  profile: BevelProfile,
  dist: Float32Array,
  radius: number,
  width: number,
  rows: number,
): BevelDetail {
  const D = 2 * radius;
  const bev = profile.bevel * radius;
  const det = new Float32Array(dist.length);
  if (profile.det) {
    const sigma = (profile.aniso ? 0 : profile.detS) * D;
    const n = materialNoise(width, rows, sigma, profile.seed + 1, profile.aniso ? [profile.aniso[0] * D, profile.aniso[1] * D, profile.aniso[2]] : null);
    for (let i = 0; i < det.length; i += 1) det[i] += n[i] * profile.det * D;
  }
  if (profile.det2) {
    const n = materialNoise(width, rows, profile.det2S * D, profile.seed + 2, null);
    for (let i = 0; i < det.length; i += 1) det[i] += n[i] * profile.det2 * D;
  }
  const height = new Float32Array(dist.length);
  if (profile.layers) {
    const lay = materialNoise(width, rows, 0, profile.seed + 3, [0.5 * D, 0.03 * D, 18]);
    for (let i = 0; i < height.length; i += 1) {
      const t = bev <= 0 ? 1 : Math.min(1, Math.max(0, dist[i] / bev));
      if (t > 0.6) height[i] += (Math.round(lay[i] * 1.5) / 1.5) * profile.layers * 0.06 * radius;
    }
  }
  for (let i = 0; i < height.length; i += 1) {
    const t = bev <= 0 ? 1 : Math.min(1, Math.max(0, dist[i] / bev));
    if (t > 0.02) height[i] += det[i];
  }
  const speckNoise = profile.speck ? materialNoise(width, rows, profile.speckS * D, profile.seed + 4, null) : null;
  const speck = new Float32Array(dist.length);
  for (let i = 0; i < speck.length; i += 1) speck[i] = 1 + (speckNoise ? profile.speck * speckNoise[i] : 0);
  const rng = splitmix(profile.seed + 11);
  const glint = new Float32Array(dist.length);
  if (profile.glint > 0) {
    const raw = new Float32Array(dist.length);
    for (let i = 0; i < raw.length; i += 1) raw[i] = rng() < profile.glint ? 1 : 0;
    const blurred = gaussianBlur(raw, width, rows, 0.8);
    for (let i = 0; i < glint.length; i += 1) glint[i] = blurred[i];
  }
  return { height, speck, glint, anisoApplied: false, noiseMatchesNumpy: false };
}

/** `build.py` line 39. `linspace(-π, π, 720, endpoint=False)`. */
export function sourceTheta(count = 720): Float64Array {
  const theta = new Float64Array(count);
  const step = (2 * Math.PI) / count;
  for (let i = 0; i < count; i += 1) theta[i] = -Math.PI + i * step;
  return theta;
}

/**
 * BASE_R is `sum(ray > 0.5) * 0.25 / 600` over `shape_mask(600, 400, 400, 800, 800)`
 * (`build.py` lines 39–43, `punktum_shape.py` `shape_mask`). The values are in
 * `sourceTables.ts`. `lib.py` is not imported; only its `BG` and `SBG` are named below.
 */
/** Nothing further is required for BASE_R. `lib.py`'s screen chain is not imported. */
export const MISSING_WARP_FILES = [] as const;

/** Page colors named by `build.py` lines 103–107. From `lib.py` line 18. Not a screen import. */
export const SOURCE_BG = '#F8F6F2';
export const SOURCE_SBG = '#0A0A09';

/** Added to the bevel color. `material.py` line 131. `g` is the blurred glint mask. */
export function glintAdd(rdl: number, g: number): number {
  return g * 4 * rdl * rdl * 120;
}

/**
 * `export-gummi.py` lines 36–39. `TH` and `radii` are `build.py` lines 39–43 and 48–83
 * (the onboarding `klumpen-a-bli-kjent` `_src/build.py`). `restR` is stored as a
 * fraction of w=240, the same unit as `BASE_R`.
 */
export type GummiWarpTables = {
  theta: ArrayLike<number> | null;
  baseR: ArrayLike<number> | null;
  restR: ArrayLike<number> | null;
};

const SOURCE_REST_FRACTION = Float64Array.from(SOURCE_REST_R, (radius) => radius / 240);

export const GUMMI_WARP_TABLES: GummiWarpTables = {
  theta: sourceTheta(),
  baseR: SOURCE_BASE_R,
  restR: SOURCE_REST_FRACTION,
};
export const GUMMI_WARP_SOURCE =
  'punktum_shape.shape_mask → BASE_R; build.py radii(240, gummi, rest); export-gummi.py warp';

export function gummiWarpReady(tables: GummiWarpTables): boolean {
  return (
    tables.theta != null &&
    tables.baseR != null &&
    tables.restR != null &&
    tables.theta.length > 0 &&
    tables.theta.length === tables.baseR.length &&
    tables.theta.length === tables.restR.length
  );
}

function interpClosed(angle: number, theta: ArrayLike<number>, values: ArrayLike<number>): number {
  const th = Array.from(theta);
  th.push(Math.PI);
  const vs = Array.from(values);
  vs.push(values[0]);
  let a = angle;
  if (a < th[0]) a = th[0];
  if (a > Math.PI) a = Math.PI;
  let i = 1;
  while (i < th.length - 1 && th[i] < a) i += 1;
  const span = th[i] - th[i - 1];
  const t = span === 0 ? 0 : (a - th[i - 1]) / span;
  return vs[i - 1] * (1 - t) + vs[i] * t;
}

/** Returns source-canvas pixels, or null when the radius tables are missing. */
export function gummiWarpPixel(x: number, y: number, tables: GummiWarpTables): { sx: number; sy: number } | null {
  if (!gummiWarpReady(tables) || !tables.theta || !tables.baseR || !tables.restR) return null;
  const w = 240;
  const xx = x / 3 - 200;
  const yy = y / 3 - 200;
  const ang = Math.atan2(yy, xx);
  const br = interpClosed(ang, tables.theta, tables.baseR) * w;
  const target = interpClosed(ang, tables.theta, tables.restR) * w;
  const rat = br / Math.max(target, 0.001);
  return { sx: (xx * rat + 0.5 * w) * 3, sy: (yy * rat + 0.423 * w) * 3 };
}

/**
 * Source-shaped φ. Pyramid while the long side is above 40 (`hires.py` lines 68–77):
 * Jacobi 400 / 150 / 80, value ×4 on each 2× cubic upsample, normalize, then
 * `gaussian_filter(phi, 1)` and clip. The blur is not applied to pillow height again.
 */
export function poissonPhi(mask: Uint8Array, width: number, height: number): Float32Array {
  const levels: { mask: Uint8Array; width: number; height: number }[] = [{ mask, width, height }];
  while (Math.max(levels[levels.length - 1].width, levels[levels.length - 1].height) > 40) {
    const top = levels[levels.length - 1];
    levels.push(downsampleMask(top.mask, top.width, top.height));
  }
  let current = { data: new Float32Array(0), width: 0, height: 0 };
  for (let li = levels.length - 1; li >= 0; li -= 1) {
    const level = levels[li];
    const start =
      current.width === 0
        ? new Float32Array(level.width * level.height)
        : upsampleValue(current.data, current.width, current.height, level.width, level.height);
    for (let i = 0; i < start.length; i += 1) if (!level.mask[i]) start[i] = 0;
    const iterations = li === levels.length - 1 ? 400 : li > 0 ? 150 : 80;
    current = {
      data: Float32Array.from(jacobiFrom(level.mask, level.width, level.height, start, iterations)),
      width: level.width,
      height: level.height,
    };
  }
  const normalized = normalize(current.data);
  const blurred = gaussianBlur(normalized, width, height, 1);
  for (let i = 0; i < blurred.length; i += 1) {
    if (!mask[i] || blurred[i] < 0) blurred[i] = 0;
    else if (blurred[i] > 1) blurred[i] = 1;
  }
  return blurred;
}

function jacobiFrom(mask: Uint8Array, width: number, height: number, start: Float32Array, iterations: number): Float32Array {
  const u = new Float32Array(start);
  const next = new Float32Array(width * height);
  for (let iter = 0; iter < iterations; iter += 1) {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const i = y * width + x;
        if (!mask[i]) {
          next[i] = 0;
          continue;
        }
        const up = y > 0 ? u[i - width] : 0;
        const down = y + 1 < height ? u[i + width] : 0;
        const left = x > 0 ? u[i - 1] : 0;
        const right = x + 1 < width ? u[i + 1] : 0;
        next[i] = 0.25 * (up + down + left + right + 1);
      }
    }
    u.set(next);
  }
  return u;
}

export function fieldRadius(dist: Float32Array): number {
  let max = 0;
  for (let i = 0; i < dist.length; i += 1) if (dist[i] > max) max = dist[i];
  return max;
}

/** Central differences, matching `numpy.gradient`. No extra blur. */
export function gradient(height: Float32Array, width: number, rows: number): { gx: Float32Array; gy: Float32Array } {
  const gx = new Float32Array(height.length);
  const gy = new Float32Array(height.length);
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      const left = height[y * width + Math.max(0, x - 1)];
      const right = height[y * width + Math.min(width - 1, x + 1)];
      const up = height[Math.max(0, y - 1) * width + x];
      const down = height[Math.min(rows - 1, y + 1) * width + x];
      const dx = x === 0 || x === width - 1 ? right - left : (right - left) / 2;
      const dy = y === 0 || y === rows - 1 ? down - up : (down - up) / 2;
      gx[i] = dx;
      gy[i] = dy;
    }
  }
  return { gx, gy };
}

export function normalsFromHeight(height: Float32Array, width: number, rows: number, step = 1): Float32Array {
  const { gx, gy } = gradient(height, width, rows);
  const scale = step === 0 ? 1 : step;
  const out = new Float32Array(height.length * 3);
  for (let i = 0; i < height.length; i += 1) {
    const x = -gx[i] / scale;
    const y = -gy[i] / scale;
    const z = 1;
    const n = Math.hypot(x, y, z);
    out[i * 3] = x / n;
    out[i * 3 + 1] = y / n;
    out[i * 3 + 2] = z / n;
  }
  return out;
}

export function macroHeight(
  id: MaterialId,
  dist: Float32Array,
  phi: Float32Array,
  radius: number,
): Float32Array {
  const profile = PROFILES[id];
  const h = new Float32Array(dist.length);
  for (let i = 0; i < dist.length; i += 1) {
    h[i] =
      profile.kind === 'pillow'
        ? pillowHeight(dist[i], radius, phi[i], profile.hs, profile.flat)
        : bevelHeight(dist[i], radius, profile.bevel, profile.hs, profile.crown);
  }
  return h;
}

function sstep(edge0: number, edge1: number, x: number): number {
  const span = edge1 - edge0;
  if (span === 0) return x < edge0 ? 0 : 1;
  const t = clamp01((x - edge0) / span);
  return t * t * (3 - 2 * t);
}

/** Gummi light. `hires.py` lines 164–176. No box term. Rim weight is 0. */
export function shadePillow(albedo: RGB, n: Vec3, profile: PillowProfile): RGB {
  const L = unitLight();
  const ndl = clamp01(n.x * L.x + n.y * L.y + n.z * L.z);
  const nz = n.z;
  const diffuse = ENV_LIGHT.amb * (0.55 + 0.45 * nz) + (ENV_LIGHT.key * profile.kd * ndl) / L.z * 0.6;
  const rv = { x: 2 * nz * n.x, y: 2 * nz * n.y, z: 2 * nz * nz - 1 };
  const rdl = clamp01(rv.x * L.x + rv.y * L.y + rv.z * L.z);
  const f = profile.f0 + (1 - profile.f0) * (1 - nz) ** 5;
  const below = clamp01(-rv.y * 0.5 + 0.5 - rv.z);
  const floor = parseHex(ENV_LIGHT.floor);
  const spec = rdl ** profile.pow * profile.spec * 255;
  const sheen = (1 - nz) ** profile.sheenExp * profile.sheen * (0.3 + 0.7 * ndl) * 255;
  const refl = f * below * profile.refl;
  const env = f * (1 - below) * profile.envRefl;
  return {
    r: albedo.r * diffuse + spec + (refl + env) * floor.r + sheen,
    g: albedo.g * diffuse + spec + (refl + env) * floor.g + sheen,
    b: albedo.b * diffuse + spec + (refl + env) * floor.b + sheen,
  };
}

/** Bevel-family light. `material.py` lines 111–126. `noise()` detail is not in the normal. */
export function shadeBevel(albedo: RGB, n: Vec3, profile: BevelProfile): RGB {
  const L = unitLight();
  const ndl = clamp01(n.x * L.x + n.y * L.y + n.z * L.z);
  const nz = n.z;
  const diffuse = ENV_LIGHT.amb * (0.55 + 0.45 * nz) + (ENV_LIGHT.key * profile.kd * ndl) / L.z * 0.6;
  const rv = { x: 2 * nz * n.x, y: 2 * nz * n.y, z: 2 * nz * nz - 1 };
  const rdl = clamp01(rv.x * L.x + rv.y * L.y + rv.z * L.z);
  const f = profile.f0 > 0 ? profile.f0 + (1 - profile.f0) * (1 - nz) ** 5 : 0;
  const below = clamp01(-rv.y * 0.5 + 0.5 - rv.z);
  const floor = parseHex(ENV_LIGHT.floor);
  const light = { r: 255, g: 252, b: 246 };
  const spec = rdl ** profile.pow * profile.spec * 255;
  const lobe = profile.box > 0 ? sstep(1 - 2.2 * profile.boxW, 1 - 0.6 * profile.boxW, rdl) : 0;
  const box = lobe * profile.box * (0.25 + 0.75 * (profile.f0 * 6)) * 255 * Math.min(1, 0.3 + f * 4);
  const sheenK = profile.sheen > 0 ? (1 - nz) ** profile.sheenExp * profile.sheen * (0.4 + 0.6 * ndl) * 0.6 : 0;
  const refl = f * below * profile.floorRefl;
  return {
    r: albedo.r * diffuse + spec + box + refl * floor.r + sheenK * light.r,
    g: albedo.g * diffuse + spec + box + refl * floor.g + sheenK * light.g,
    b: albedo.b * diffuse + spec + box + refl * floor.b + sheenK * light.b,
  };
}

export function shadeNormal(id: MaterialId, n: Vec3, albedo?: RGB): RGB {
  const profile = PROFILES[id];
  const alb = albedo ?? parseHex(profile.albedo);
  return profile.kind === 'pillow' ? shadePillow(alb, n, profile) : shadeBevel(alb, n, profile);
}

/** Bilinear sample of an RGBA8888 master. Coordinates are source pixels. */
export function sampleRgba(pixels: Uint8Array, width: number, height: number, x: number, y: number): RGB {
  if (width <= 0 || height <= 0 || pixels.length < width * height * 4) return { r: 0, g: 0, b: 0 };
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = x - x0;
  const ty = y - y0;
  const at = (ix: number, iy: number): RGB => {
    const xx = Math.min(width - 1, Math.max(0, ix));
    const yy = Math.min(height - 1, Math.max(0, iy));
    const i = (yy * width + xx) * 4;
    return { r: pixels[i], g: pixels[i + 1], b: pixels[i + 2] };
  };
  const a = at(x0, y0);
  const b = at(x0 + 1, y0);
  const c = at(x0, y0 + 1);
  const d = at(x0 + 1, y0 + 1);
  const mix = (p: number, q: number, t: number) => p * (1 - t) + q * t;
  return {
    r: mix(mix(a.r, b.r, tx), mix(c.r, d.r, tx), ty),
    g: mix(mix(a.g, b.g, tx), mix(c.g, d.g, tx), ty),
    b: mix(mix(a.b, b.b, tx), mix(c.b, d.b, tx), ty),
  };
}

/** One pixel of the shader before the rim is added: master albedo, then the path light. */
export function litFromBase(
  pixels: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number,
  normal: Vec3,
  id: MaterialId,
): RGB {
  return shadeNormal(id, normal, sampleRgba(pixels, width, height, x, y));
}

/** Which fbm cells survive at a given object width. `hires.py` lines 27–31. */
export function survivingCells(cells: readonly number[], objectWidth: number, minCell = FBM_MIN_CELL): boolean[] {
  return cells.map((cell) => cell * objectWidth >= minCell);
}

export function gummiGrainSurvivesAtSourceD(): boolean[] {
  const gummi = PROFILES.gummi;
  if (gummi.kind !== 'pillow') return [];
  return survivingCells(gummi.grainCell, GUMMI_SOURCE_D);
}

/**
 * `hires.py` `_hash`, lines 12–16. Low 32 bits of the int64 product, then the mask.
 * `Math.imul` drops bits once an index exceeds int32, so this uses bigint.
 */
export function hash01(ix: number, iy: number, seed: number): number {
  const mask = 0xffffffffn;
  let h = (BigInt(ix) * 374761393n + BigInt(iy) * 668265263n + BigInt(seed) * 982451653n) & mask;
  h = ((h ^ (h >> 13n)) * 1274126177n) & mask;
  h = h ^ (h >> 16n);
  return Number(h & 0xffffffn) / 0xffffff;
}

/**
 * One Worley bowl, `hires.py` `spots` lines 34–47.
 * Returns 0 when rmax < 0.6, which is the source's pixel-size gate.
 */
export function spotsAt(x: number, y: number, cell: number, prob: number, rmin: number, rmax: number, seed: number): number {
  if (rmax < 0.6 || cell <= 0) return 0;
  const gx = Math.floor(x / cell);
  const gy = Math.floor(y / cell);
  let out = 0;
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const ix = gx + dx;
      const iy = gy + dy;
      if (hash01(ix, iy, seed) >= prob) continue;
      const px = (ix + hash01(ix, iy, seed + 1)) * cell;
      const py = (iy + hash01(ix, iy, seed + 2)) * cell;
      const r = rmin + (rmax - rmin) * hash01(ix, iy, seed + 3) ** 2;
      const d2 = ((x - px) ** 2 + (y - py) ** 2) / (r * r);
      out = Math.max(out, clamp01(1 - d2));
    }
  }
  return out;
}

/** Pore darkening factor from `hires.py` line 163. 1 means no pit. */
export function poreDarkening(pit: number): number {
  return 1 - 0.35 * Math.sqrt(Math.max(0, pit));
}

export type DarkRimControls = {
  widthPt: number | null;
  placement: 'inside' | 'center' | 'outside' | null;
  falloffPx: number | null;
};

/** Older unset stroke. It is not the source rim and it is not painted. */
export const DARK_RIM_UNSET: DarkRimControls = { widthPt: null, placement: null, falloffPx: null };
export const DARK_RIM_AGAINST = '#111110';
export const DARK_RIM_TARGET_CONTRAST = 3;

export function darkRimReady(controls: DarkRimControls): boolean {
  return controls.widthPt != null && controls.placement != null && controls.falloffPx != null;
}

/**
 * `build_6e59.py` `rim` / `fit`, lines 11–21, converted from @3x pixels to points.
 * 4 px → 4/3 pt, σ 2 px → 2/3 pt, shift 9 px → 3 pt.
 * These point lengths stay fixed at every Klumpen width. They are not scaled by 120/160/200/240.
 */
export const RIM_SAMPLE_PX_PER_PT = 3;
export const RIM_EROSION_PT = 4 / 3;
export const RIM_BLUR_PT = 2 / 3;
export const RIM_SHIFT_PT = 3;
export const RIM_GAIN = 1.6;
export const RIM_ADD: RGB = { r: 120, g: 114, b: 104 };
export const RIM_K_MAX = 1.5;
export const RIM_BISECTIONS = 14;
export const RIM_BAND_MIN = 0.3;

export function rimLengthsPx(pxPerPt: number): { erosion: number; blur: number; shift: number } {
  return {
    erosion: RIM_EROSION_PT * pxPerPt,
    blur: RIM_BLUR_PT * pxPerPt,
    shift: RIM_SHIFT_PT * pxPerPt,
  };
}

const ERODE_CROSS = [
  [0, 0],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

/** SciPy's default cross, border 0, repeated. `binary_erosion(..., iterations=4)`. */
export function erodeCross(mask: Uint8Array, width: number, height: number, iterations: number): Uint8Array {
  let cur = mask;
  for (let iter = 0; iter < iterations; iter += 1) {
    const next = new Uint8Array(cur.length);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        let keep = 1;
        for (const [dx, dy] of ERODE_CROSS) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= width || yy >= height || !cur[yy * width + xx]) keep = 0;
        }
        next[y * width + x] = keep;
      }
    }
    cur = next;
  }
  return cur;
}

function roll(mask: Uint8Array, width: number, height: number, dy: number, dx: number): Uint8Array {
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const yy = (y - dy + height) % height;
      const xx = (x - dx + width) % width;
      out[y * width + x] = mask[yy * width + xx];
    }
  }
  return out;
}

export type RimBand = {
  band: Float32Array;
  edge: Uint8Array;
};

/** `rim()` lines 12–13, before k. Lengths are points times the sample scale, not the stone width. */
export function rimBand(mask: Uint8Array, width: number, height: number, pxPerPt = RIM_SAMPLE_PX_PER_PT): RimBand {
  const lengths = rimLengthsPx(pxPerPt);
  const eroded = erodeCross(mask, width, height, Math.round(lengths.erosion));
  const edge = new Uint8Array(mask.length);
  const raw = new Float32Array(mask.length);
  const shift = Math.round(lengths.shift);
  const shifted = roll(mask, width, height, shift, shift);
  for (let i = 0; i < mask.length; i += 1) {
    edge[i] = mask[i] && !eroded[i] && !shifted[i] ? 1 : 0;
    raw[i] = edge[i];
  }
  const blurred = gaussianBlur(raw, width, height, lengths.blur);
  const band = new Float32Array(mask.length);
  for (let i = 0; i < band.length; i += 1) {
    const v = Math.min(1, Math.max(0, blurred[i] * RIM_GAIN));
    band[i] = mask[i] ? v : 0;
  }
  return { band, edge };
}

export function meanSelectedColor(
  image: Float32Array,
  edge: Uint8Array,
  band: Float32Array,
): RGB | null {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let i = 0; i < edge.length; i += 1) {
    if (!edge[i] || band[i] <= RIM_BAND_MIN) continue;
    r += image[i * 3];
    g += image[i * 3 + 1];
    b += image[i * 3 + 2];
    n += 1;
  }
  if (!n) return null;
  return { r: r / n, g: g / n, b: b / n };
}

function contrastOf(color: RGB): number {
  const f = (c: number) => {
    const s = Math.min(255, Math.max(0, c)) / 255;
    const lin = s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    return lin;
  };
  const L = 0.2126 * f(color.r) + 0.7152 * f(color.g) + 0.0722 * f(color.b);
  const bg = relativeLuminance(DARK_RIM_AGAINST);
  return (Math.max(L, bg) + 0.05) / (Math.min(L, bg) + 0.05);
}

function addRim(base: Float32Array, band: Float32Array, k: number): Float32Array {
  const out = new Float32Array(base.length);
  for (let i = 0; i < band.length; i += 1) {
    const w = band[i] * k;
    out[i * 3] = Math.min(255, Math.max(0, base[i * 3] + RIM_ADD.r * w));
    out[i * 3 + 1] = Math.min(255, Math.max(0, base[i * 3 + 1] + RIM_ADD.g * w));
    out[i * 3 + 2] = Math.min(255, Math.max(0, base[i * 3 + 2] + RIM_ADD.b * w));
  }
  return out;
}

export type RimFit = {
  applied: boolean;
  k: number;
  contrast: number | null;
  band: Float32Array;
  /** Mean of the selected pixels, not the brightest pixel. */
  meanContrast: true;
};

/** Fourteen bisections of [0, 1.5], then the high side. `fit()` lines 16–21. */
export function fitRim(
  base: Float32Array,
  mask: Uint8Array,
  width: number,
  height: number,
  pxPerPt = RIM_SAMPLE_PX_PER_PT,
  target = DARK_RIM_TARGET_CONTRAST,
): RimFit {
  const { band, edge } = rimBand(mask, width, height, pxPerPt);
  let lo = 0;
  let hi = RIM_K_MAX;
  for (let step = 0; step < RIM_BISECTIONS; step += 1) {
    const k = (lo + hi) / 2;
    const mean = meanSelectedColor(addRim(base, band, k), edge, band);
    const c = mean ? contrastOf(mean) : 0;
    if (c < target) lo = k;
    else hi = k;
  }
  const painted = addRim(base, band, hi);
  const mean = meanSelectedColor(painted, edge, band);
  return { applied: mean != null, k: mean ? hi : 0, contrast: mean ? contrastOf(mean) : null, band, meanContrast: true };
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export type PathField = {
  width: number;
  height: number;
  radius: number;
  dist: Float32Array;
  phi: Float32Array;
  heightMap: Float32Array;
  normals: Float32Array;
  speck: Float32Array | null;
  glint: Float32Array | null;
  /** Bevel det/layers are in the height. They are not NumPy-identical. Gummi warp is not. */
  detailApplied: boolean;
  noiseMatchesNumpy: false;
  /** Ready when BASE_R and the rest radii from `build.py` are loaded. */
  gummiWarp: 'missing-punktum-shape' | 'ready';
  usesRestLightMaps: false;
};

export function buildField(mask: Uint8Array, width: number, height: number, id: MaterialId): PathField {
  const dist = insideDistance(mask, width, height);
  const radius = fieldRadius(dist);
  const profile = PROFILES[id];
  const phi = profile.kind === 'pillow' ? poissonPhi(mask, width, height) : new Float32Array(mask.length);
  let heightMap = macroHeight(id, dist, phi, radius);
  if (profile.kind === 'bevel') heightMap = gaussianBlur(heightMap, width, height, profile.heightBlur);
  return {
    width,
    height,
    radius,
    dist,
    phi,
    heightMap,
    normals: normalsFromHeight(heightMap, width, height),
    speck: null,
    glint: null,
    detailApplied: false,
    noiseMatchesNumpy: false,
    gummiWarp: gummiWarpReady(GUMMI_WARP_TABLES) ? 'ready' : 'missing-punktum-shape',
    usesRestLightMaps: false,
  };
}

/** Lit RGB from the same shade used by the shader, one color per normal. */
export function litPlate(normals: Float32Array, id: MaterialId): Float32Array {
  const plate = new Float32Array(normals.length);
  for (let i = 0; i < normals.length / 3; i += 1) {
    const color = shadeNormal(id, {
      x: normals[i * 3],
      y: normals[i * 3 + 1],
      z: normals[i * 3 + 2],
    });
    plate[i * 3] = color.r;
    plate[i * 3 + 1] = color.g;
    plate[i * 3 + 2] = color.b;
  }
  return plate;
}

export function diskMask(size: number, radius: number): Uint8Array {
  const mask = new Uint8Array(size * size);
  const c = (size - 1) / 2;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x - c;
      const dy = y - c;
      if (dx * dx + dy * dy <= radius * radius) mask[y * size + x] = 1;
    }
  }
  return mask;
}

/**
 * SKSL for the tested shade. Children: albedo, then normals in 0..1 (xyz*0.5+0.5).
 * Rest light maps are not declared.
 */
export const PATH_LIGHT_SKSL = `
uniform shader albedo;
uniform shader normals;
uniform float pillow;
uniform float key;
uniform float amb;
uniform float kd;
uniform float spec;
uniform float specPow;
uniform float f0;
uniform float refl;
uniform float envRefl;
uniform float sheen;
uniform float sheenExp;
uniform float boxAmt;
uniform float boxW;
uniform float floorRefl;
uniform float lx;
uniform float ly;
uniform float lz;
uniform float floorR;
uniform float floorG;
uniform float floorB;
uniform shader rim;
uniform float rimK;

float sat(float v) { return clamp(v, 0.0, 1.0); }
float sstep(float a, float b, float x) {
  float t = sat((x - a) / (b - a));
  return t * t * (3.0 - 2.0 * t);
}

half4 main(float2 xy) {
  half4 alb = albedo.eval(xy);
  half4 nn = normals.eval(xy);
  half4 rimPx = rim.eval(xy);
  float3 n = float3(nn.r, nn.g, nn.b) * 2.0 - 1.0;
  float nz = n.z;
  float ndl = sat(n.x * lx + n.y * ly + n.z * lz);
  float diffuse = amb * (0.55 + 0.45 * nz) + (key * kd * ndl) / lz * 0.6;
  float3 rv = float3(2.0 * nz * n.x, 2.0 * nz * n.y, 2.0 * nz * nz - 1.0);
  float rdl = sat(rv.x * lx + rv.y * ly + rv.z * lz);
  float fres = f0 + (1.0 - f0) * pow(1.0 - nz, 5.0);
  float below = sat(-rv.y * 0.5 + 0.5 - rv.z);
  float3 col = float3(alb.rgb) * 255.0 * diffuse;
  col += rdl == 0.0 ? 0.0 : pow(rdl, specPow) * spec * 255.0;
  if (pillow > 0.5) {
    float sheenK = pow(1.0 - nz, sheenExp) * sheen * (0.3 + 0.7 * ndl) * 255.0;
    float floorK = fres * below * refl + fres * (1.0 - below) * envRefl;
    col += float3(floorR, floorG, floorB) * floorK + sheenK;
  } else {
    float lobe = boxAmt > 0.0 ? sstep(1.0 - 2.2 * boxW, 1.0 - 0.6 * boxW, rdl) : 0.0;
    float boxK = lobe * boxAmt * (0.25 + 0.75 * (f0 * 6.0)) * 255.0 * min(1.0, 0.3 + fres * 4.0);
    float sheenK = sheen > 0.0 ? pow(1.0 - nz, sheenExp) * sheen * (0.4 + 0.6 * ndl) * 0.6 : 0.0;
    col += boxK + float3(floorR, floorG, floorB) * (fres * below * floorRefl);
    col += float3(255.0, 252.0, 246.0) * sheenK;
  }
  col += float3(120.0, 114.0, 104.0) * rimPx.r * rimK;
  return half4(clamp(col / 255.0, 0.0, 1.0), alb.a);
}
`;
