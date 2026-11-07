/**
 * Path-dependent height and light. Rest shade/light maps are not samples.
 *
 * Gummi is the hires pillow (`hires.py` HR['gummi']), not `MATERIALS['gummi']`.
 * φ is the normalized solution of ∇²u = -1 inside the mask and u = 0 outside
 * (`hires.py` `poisson_phi`, lines 67–78). A local bevel SDF is not this φ.
 * The four other materials keep `material.py` `render_object` lines 84–103 and 111–126.
 * Emalje uses the export overrides box=0.40, box_w=0.17, det=0.00002.
 *
 * Detail fbm/Worley is the hires hash (`hires.py` lines 12–47). It is not applied
 * on top of `base.png`: that file was Lanczos-scaled and radially warped, and that
 * warp is not a runtime path coordinate. Octave survival is defined at source D=1440.
 */

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
  /** Stored from the export. `material.py` `noise()` is not ported, so this is not added to h. */
  det: number;
  detailApplied: false;
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
    det: 0.004,
    detailApplied: false,
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
    det: 0.006,
    detailApplied: false,
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
    det: 0.00002,
    detailApplied: false,
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
    det: 0.0015,
    detailApplied: false,
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
export function gaussianBlur(src: Float32Array, width: number, height: number, sigma: number): Float32Array {
  const radius = Math.max(1, Math.ceil(sigma * 3));
  const kernel = new Float64Array(radius * 2 + 1);
  let sum = 0;
  for (let i = -radius; i <= radius; i += 1) {
    const w = Math.exp(-0.5 * (i / sigma) * (i / sigma));
    kernel[i + radius] = w;
    sum += w;
  }
  for (let i = 0; i < kernel.length; i += 1) kernel[i] /= sum;
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let acc = 0;
      for (let k = -radius; k <= radius; k += 1) {
        const xx = Math.min(width - 1, Math.max(0, x + k));
        acc += src[y * width + xx] * kernel[k + radius];
      }
      tmp[y * width + x] = acc;
    }
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let acc = 0;
      for (let k = -radius; k <= radius; k += 1) {
        const yy = Math.min(height - 1, Math.max(0, y + k));
        acc += tmp[yy * width + x] * kernel[k + radius];
      }
      out[y * width + x] = acc;
    }
  }
  return out;
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

export function normalsFromHeight(height: Float32Array, width: number, rows: number): Float32Array {
  const { gx, gy } = gradient(height, width, rows);
  const out = new Float32Array(height.length * 3);
  for (let i = 0; i < height.length; i += 1) {
    const x = -gx[i];
    const y = -gy[i];
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

export function shadeNormal(id: MaterialId, n: Vec3): RGB {
  const profile = PROFILES[id];
  const albedo = parseHex(profile.albedo);
  return profile.kind === 'pillow' ? shadePillow(albedo, n, profile) : shadeBevel(albedo, n, profile);
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

/** `hires.py` lines 12–16. Unsigned 32-bit, matching the Python mask. */
export function hash01(ix: number, iy: number, seed: number): number {
  let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 982451653)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return (h & 0xffffff) / 0xffffff;
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

/** Nothing here is a chosen look. The 3:1 target is the approved aim, not a stroke. */
export const DARK_RIM_UNSET: DarkRimControls = { widthPt: null, placement: null, falloffPx: null };
export const DARK_RIM_AGAINST = '#111110';
export const DARK_RIM_TARGET_CONTRAST = 3;

export function darkRimReady(controls: DarkRimControls): boolean {
  return controls.widthPt != null && controls.placement != null && controls.falloffPx != null;
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
  /** Pillow detail is not in this height. The base.png warp is unresolved. */
  detailApplied: false;
  usesRestLightMaps: false;
};

export function buildField(mask: Uint8Array, width: number, height: number, id: MaterialId): PathField {
  const dist = insideDistance(mask, width, height);
  const radius = fieldRadius(dist);
  const phi = id === 'gummi' ? poissonPhi(mask, width, height) : new Float32Array(mask.length);
  let heightMap = macroHeight(id, dist, phi, radius);
  if (PROFILES[id].kind === 'bevel') heightMap = gaussianBlur(heightMap, width, height, PROFILES[id].heightBlur);
  return {
    width,
    height,
    radius,
    dist,
    phi,
    heightMap,
    normals: normalsFromHeight(heightMap, width, height),
    detailApplied: false,
    usesRestLightMaps: false,
  };
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

float sat(float v) { return clamp(v, 0.0, 1.0); }
float sstep(float a, float b, float x) {
  float t = sat((x - a) / (b - a));
  return t * t * (3.0 - 2.0 * t);
}

half4 main(float2 xy) {
  half4 alb = albedo.eval(xy);
  half4 nn = normals.eval(xy);
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
  return half4(clamp(col / 255.0, 0.0, 1.0), alb.a);
}
`;
