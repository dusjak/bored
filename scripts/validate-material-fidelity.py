#!/usr/bin/env python3
"""Rest-pose fidelity of the unmounted material renderer.

This is a mathematical port of the shade formulas and of numpy.gradient.
It does not execute Skia. The unmounted renderer uploads these same 1 px
normals; this script measures them against the master PNGs and, for Gummi,
against stone-home@6x.npz through the export-gummi.py crop and radial warp.

Engineering targets below are Pål's proposals, not visual acceptance.
"""

from __future__ import annotations

import hashlib
import json
import re
import sys
import zlib
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parents[1]
MAT = ROOT / 'assets/materials/2026-11-07'
SRC = ROOT / 'src/materials/source'
TABLES = ROOT / 'src/materials/sourceTables.ts'
NPZ = SRC / 'stone-home@6x.npz'
OUT = ROOT / 'src/materials/fidelity-report.json'

MASTER = 1200
CX = CY = 1260
W_PT = 240
# export-gummi.py line 39. Not half of the crop: that half is recorded separately.
WARP_Y_OFFSET = 0.423


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def load_tables():
    text = TABLES.read_text()
    def grab(name):
        body = re.search(rf'{name} = new Float64Array\(\[(.*?)\]\)', text, re.S).group(1)
        return np.array([float(x) for x in body.split(',') if x.strip()], np.float64)
    base = grab('SOURCE_BASE_R')
    rest = grab('SOURCE_REST_R')
    if base.size != 720 or rest.size != 720:
        raise SystemExit(f'expected 720 radii, got {base.size} {rest.size}')
    return base, rest


def theta():
    return np.linspace(-np.pi, np.pi, 720, endpoint=False)


def radii_rest(base_r, mat):
    """build.py radii() at state rest. Skifer skips the gaussian."""
    th = theta()
    w = W_PT
    r = base_r * w
    sw, sh = 110, 112
    ca = np.maximum(np.abs(np.cos(th)), 1e-5)
    sa = np.maximum(np.abs(np.sin(th)), 1e-5)
    rmin = np.minimum((sw / 2 + 3) / ca, (sh / 2 + 3) / sa)
    rmax = np.minimum(0.575 * w / ca, 0.51 * w / sa)
    r = np.clip(r, rmin, rmax)
    if mat != 'skifer':
        for _ in range(3):
            r = np.clip(ndi.gaussian_filter1d(r, 5, mode='wrap'), rmin, rmax)
    base_safe = np.maximum(base_r * w, rmin)
    n = 720
    for _ in range(40):
        x = r * np.cos(th)
        y = r * np.sin(th)
        area = 0.5 * np.sum(r * r) * (2 * np.pi / n)
        a0 = 0.5 * np.sum(base_safe * base_safe) * (2 * np.pi / n)
        if np.ptp(x) >= 0.90 * w and np.ptp(y) >= 0.74 * w and 0.86 <= area / a0 <= 1.18:
            break
        r = 0.9 * r + 0.1 * base_safe
    return r


def local_mask(radii):
    """build.py local_mask, scale 3, blur 0.19*scale."""
    th = theta()
    side = 1200
    image = Image.new('L', (side, side), 0)
    pts = np.stack((200 + radii * np.cos(th), 200 + radii * np.sin(th)), -1) * 3
    ImageDraw.Draw(image).polygon([tuple(map(float, p)) for p in pts], fill=255)
    image = image.filter(ImageFilter.GaussianBlur(0.57))
    return np.asarray(image, np.float32) / 255


def f16_load(path, shape):
    raw = zlib.decompress(path.read_bytes())
    return np.frombuffer(raw, np.float16).astype(np.float32).reshape(shape)


def f16_save(path, values):
    path.write_bytes(zlib.compress(np.ascontiguousarray(values, np.float32).astype(np.float16).tobytes(), 9))


def normals_from(height):
    """numpy.gradient, then (-gx, -gy, 1) normalized. material.py lines 102–103."""
    gy, gx = np.gradient(height.astype(np.float32))
    n = np.stack([-gx, -gy, np.ones_like(gy)], -1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    return n


def normals_step10(height):
    """Previous renderer: 120 samples across 1200, gradient step 10 px, nearest back."""
    size = 120
    xs = (np.arange(size) + 0.5) / size * MASTER
    ys = xs
    small = ndi.map_coordinates(height, np.meshgrid(ys, xs, indexing='ij'), order=1, mode='nearest')
    gy, gx = np.gradient(small)
    step = MASTER / size
    n = np.stack([-gx / step, -gy / step, np.ones_like(gy)], -1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    full = np.empty(height.shape + (3,), np.float32)
    for k in range(3):
        full[..., k] = ndi.zoom(n[..., k], MASTER / size, order=0)
    full /= np.linalg.norm(full, axis=-1, keepdims=True)
    return full


def angle_deg(a, b):
    dot = np.clip((a * b).sum(-1), -1, 1)
    return np.degrees(np.arccos(dot))


def stats(values):
    values = np.asarray(values, np.float64)
    if values.size == 0:
        return {'count': 0, 'mae': None, 'max': None, 'p95': None}
    return {
        'count': int(values.size),
        'mae': float(values.mean()),
        'max': float(values.max()),
        'p95': float(np.percentile(values, 95)),
    }


def band_energy(lum, region):
    """Energy of scales between a 1 px and a 10 px Gaussian."""
    band = ndi.gaussian_filter(lum, 1) - ndi.gaussian_filter(lum, 10)
    return float(np.mean(band[region] ** 2))


def unit_light():
    light = np.array([-0.42, -0.62, 0.66], np.float32)
    return light / np.linalg.norm(light)


def sstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def shade(albedo, n, kind):
    """Port of shadePillow / shadeBevel. Not a Skia run."""
    light = unit_light()
    nz = n[..., 2]
    ndl = np.clip((n * light).sum(-1), 0, 1)
    if kind == 'gummi':
        kd, spec, power, f0 = 1.0, 0.07, 2.6, 0.03
        refl, env_refl, sheen = 0.4, 0.12, 0.04
        diffuse = 0.35 * (0.55 + 0.45 * nz) + (0.75 * kd * ndl) / light[2] * 0.6
        rv = np.stack([2 * nz * n[..., 0], 2 * nz * n[..., 1], 2 * nz * nz - 1], -1)
        rdl = np.clip((rv * light).sum(-1), 0, 1)
        fres = f0 + (1 - f0) * (1 - nz) ** 5
        below = np.clip(-rv[..., 1] * 0.5 + 0.5 - rv[..., 2], 0, 1)
        floor = np.array([0xF0, 0xED, 0xE7], np.float32)
        col = albedo * diffuse[..., None]
        col = col + (rdl ** power * spec * 255)[..., None]
        col = col + (fres * below * refl + fres * (1 - below) * env_refl)[..., None] * floor
        col = col + ((1 - nz) ** 1.5 * sheen * (0.3 + 0.7 * ndl) * 255)[..., None]
        return col
    # bevel parameters. Emalje overrides match export.py.
    table = {
        'skifer': dict(kd=1, spec=0.10, power=9, f0=0.03, box=0, box_w=0, sheen=0, sheen_exp=1, floor_refl=0.55),
        'kull': dict(kd=1, spec=0.02, power=4, f0=0.01, box=0, box_w=0, sheen=0, sheen_exp=1, floor_refl=0.55),
        'emalje': dict(kd=1, spec=0, power=40, f0=0.045, box=0.40, box_w=0.17, sheen=0, sheen_exp=1, floor_refl=0.55),
        'floyel': dict(kd=0.5, spec=0, power=2, f0=0, box=0, box_w=0, sheen=1, sheen_exp=1.2, floor_refl=0.55),
    }[kind]
    diffuse = 0.35 * (0.55 + 0.45 * nz) + (0.75 * table['kd'] * ndl) / light[2] * 0.6
    rv = np.stack([2 * nz * n[..., 0], 2 * nz * n[..., 1], 2 * nz * nz - 1], -1)
    rdl = np.clip((rv * light).sum(-1), 0, 1)
    fres = table['f0'] + (1 - table['f0']) * (1 - nz) ** 5 if table['f0'] > 0 else np.zeros_like(nz)
    below = np.clip(-rv[..., 1] * 0.5 + 0.5 - rv[..., 2], 0, 1)
    floor = np.array([0xF0, 0xED, 0xE7], np.float32)
    col = albedo * diffuse[..., None] + (rdl ** table['power'] * table['spec'] * 255)[..., None]
    if table['box'] > 0:
        lobe = sstep(1 - 2.2 * table['box_w'], 1 - 0.6 * table['box_w'], rdl)
        col = col + (lobe * table['box'] * (0.25 + 0.75 * (table['f0'] * 6)) * 255 * np.minimum(1, 0.3 + fres * 4))[..., None]
    col = col + (fres * below * table['floor_refl'])[..., None] * floor
    if table['sheen'] > 0:
        sheen = (1 - nz) ** table['sheen_exp'] * table['sheen'] * (0.4 + 0.6 * ndl) * 0.6
        col = col + sheen[..., None] * np.array([255, 252, 246], np.float32)
    if kind == 'kull':
        # material.py lines 130–132. Sparse dots, seed 47+11, then a 0.8 px blur.
        rng = np.random.default_rng(58)
        dots = (rng.random(nz.shape) < 0.0008).astype(np.float32)
        blurred = ndi.gaussian_filter(dots, 0.8)
        rv = np.stack([2 * nz * n[..., 0], 2 * nz * n[..., 1], 2 * nz * nz - 1], -1)
        rdl = np.clip((rv * light).sum(-1), 0, 1)
        col = col + (blurred * 4 * rdl ** 2 * 120)[..., None]
    return col


def reference_color(name):
    folder = MAT / name
    base = np.asarray(Image.open(folder / 'base.png').convert('RGB'), np.float32)
    shade = np.asarray(Image.open(folder / 'shade-multiply.png').convert('RGB'), np.float32) / 255
    light = np.asarray(Image.open(folder / 'light-screen.png').convert('RGB'), np.float32) / 255
    aq = np.round(base)
    sq = np.round(shade * 255) / 255
    lq = np.round(light * 255) / 255
    recon = 255 - (255 - aq * sq) * (1 - lq)
    return base, recon


def regions(mask):
    dist = ndi.distance_transform_edt(mask > 0.5)
    interior = dist > 12
    edge = (dist > 0) & (dist <= 12)
    return dist, interior, edge


def color_error(lit, ref, region):
    err = np.abs(np.clip(lit, 0, 255) - ref)
    # max over RGB, then the region, so one channel cannot hide
    per = err.max(-1)
    return stats(per[region])


def lum(rgb):
    return 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]


def compare_material(name, height_runtime, height_source, mask, runtime_normals=None):
    _, interior, edge = regions(mask)
    n_src = normals_from(height_source)
    n_rt = runtime_normals if runtime_normals is not None else normals_from(height_runtime)
    n_old = normals_step10(height_runtime)
    ang = angle_deg(n_rt, n_src)
    ang_old = angle_deg(n_old, n_src)
    base, ref = reference_color(name)
    lit = np.clip(shade(base, n_rt, name), 0, 255)
    lit_old = shade(base, n_old, name)
    per = np.abs(lit - ref).max(-1)
    signed = (lit - ref).mean(-1)
    e_src = band_energy(lum(ref), interior)
    e_rt = band_energy(lum(np.clip(lit, 0, 255)), interior)
    e_old = band_energy(lum(np.clip(lit_old, 0, 255)), interior)
    return {
        'normal_angle_deg_vs_source_1px': {
            'runtime_1px': {**stats(ang[interior]), 'region': 'interior>12px'},
            'runtime_1px_edge_0_12px': stats(ang[edge]),
            'previous_10px_step': stats(ang_old[interior]),
        },
        'color_8bit_vs_base_shade_light': {
            'runtime_1px_interior_gt_12px': color_error(lit, ref, interior),
            'runtime_1px_edge_0_12px': {
                **color_error(lit, ref, edge),
                'count_abs_gt_8': int((edge & (per > 8)).sum()),
                'count_abs_gt_15': int((edge & (per > 15)).sum()),
                'mean_signed_port_minus_source': float(signed[edge].mean()) if edge.any() else None,
            },
            'previous_10px_interior_gt_12px': color_error(lit_old, ref, interior),
            'note': 'Shader formula without the export seed-100 grain. Reference composite includes that grain. Not a Skia frame.',
        },
        'detail_highpass_1_to_10px': {
            'energy_reference': e_src,
            'energy_runtime_1px': e_rt,
            'energy_previous_10px': e_old,
            'ratio_runtime_over_reference': None if e_src == 0 else e_rt / e_src,
            'ratio_previous_over_reference': None if e_src == 0 else e_old / e_src,
            'definition': 'mean square of gaussian(lum,1) - gaussian(lum,10) on interior>12px',
        },
        '_frames': (ref, lit, per, edge),
    }


def noise(shape, sigma, seed, aniso=None):
    rng = np.random.default_rng(seed)
    n = rng.normal(0, 1, shape).astype(np.float32)
    if aniso:
        sx, sy, rot = aniso
        n = ndi.rotate(n, rot, reshape=False, mode='wrap')
        n = ndi.gaussian_filter(n, (max(sy, 0.5), max(sx, 0.5)))
        n = ndi.rotate(n, -rot, reshape=False, mode='wrap')
    else:
        n = ndi.gaussian_filter(n, max(sigma, 0.5))
    return n / (n.std() + 1e-6)


def source_bevel_height(mask, kind):
    """material.py render_object height, seed 47. Float64 source for the normal angle."""
    dist = ndi.distance_transform_edt(mask > 0.5).astype(np.float64)
    radius = float(dist.max())
    diameter = 2 * radius
    params = {
        'skifer': dict(bevel=0.16, hs=0.35, crown=0, det=0.004, det_s=0.01, aniso=(0.12, 0.018, 18), det2=0.0015, det2_s=0.006, layers=0.10),
        'kull': dict(bevel=0.5, hs=0.55, crown=0.05, det=0.006, det_s=0.008, aniso=None, det2=0.002, det2_s=0.003, layers=0),
        'emalje': dict(bevel=0.4, hs=0.55, crown=0.06, det=0.00002, det_s=0.02, aniso=None, det2=0, det2_s=0, layers=0),
        'floyel': dict(bevel=0.85, hs=0.45, crown=0, det=0.0015, det_s=0.0016, aniso=None, det2=0, det2_s=0, layers=0),
    }[kind]
    bev = params['bevel'] * radius
    t = np.clip(dist / max(bev, 1e-6), 0, 1)
    height = np.sqrt(1 - (1 - t) ** 2) * bev * params['hs'] + params['crown'] * radius * np.clip(dist / max(radius, 1e-6), 0, 1) ** 1.5
    seed = 47
    if params['layers']:
        lay = noise(mask.shape, 0, seed + 3, aniso=(0.5 * diameter, 0.03 * diameter, 18))
        height = height + (np.round(lay * 1.5) / 1.5) * params['layers'] * 0.06 * radius * (t > 0.6)
    detail = np.zeros(mask.shape, np.float64)
    if params['det']:
        an = params['aniso']
        aniso = (an[0] * diameter, an[1] * diameter, an[2]) if an else None
        detail = detail + noise(mask.shape, params['det_s'] * diameter, seed + 1, aniso=aniso) * params['det'] * diameter
    if params['det2']:
        detail = detail + noise(mask.shape, params['det2_s'] * diameter, seed + 2) * params['det2'] * diameter
    height = height + detail * (t > 0.02)
    height = ndi.gaussian_filter(height, 0.6)
    return height, radius


def poisson_phi(mask):
    levels = [mask.astype(np.float32)]
    while max(levels[-1].shape) > 40:
        levels.append(ndi.zoom(levels[-1], 0.5, order=1))
    u = np.zeros_like(levels[-1])
    for li in range(len(levels) - 1, -1, -1):
        mk = (levels[li] > 0.5).astype(np.float32)
        if u.shape != mk.shape:
            u = ndi.zoom(u, (mk.shape[0] / u.shape[0], mk.shape[1] / u.shape[1]), order=1) * 4
        iterations = 400 if li == len(levels) - 1 else (150 if li > 0 else 80)
        for _ in range(iterations):
            u = mk * (0.25 * (np.roll(u, 1, 0) + np.roll(u, -1, 0) + np.roll(u, 1, 1) + np.roll(u, -1, 1)) + 0.25)
    return np.clip(u / max(float(u.max()), 1e-8), 0, 1)


def hash01(ix, iy, seed):
    h = (ix.astype(np.int64) * 374761393 + iy.astype(np.int64) * 668265263 + np.int64(seed) * 982451653) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * np.int64(1274126177)) & 0xFFFFFFFF
    h = h ^ (h >> 16)
    return (h & 0xFFFFFF).astype(np.float32) / np.float32(0xFFFFFF)


def vnoise(x, y, cell, seed, rot):
    c, s = np.cos(rot), np.sin(rot)
    px = (x * c - y * s) / cell
    py = (x * s + y * c) / cell
    ix, iy = np.floor(px), np.floor(py)
    fx, fy = px - ix, py - iy
    ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10)
    uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10)
    ix = ix.astype(np.int64)
    iy = iy.astype(np.int64)
    a, b = hash01(ix, iy, seed), hash01(ix + 1, iy, seed)
    cc, d = hash01(ix, iy + 1, seed), hash01(ix + 1, iy + 1, seed)
    v = (a + (b - a) * ux) * (1 - uy) + (cc + (d - cc) * ux) * uy
    return (v * 2 - 1) * 1.7


def fbm(x, y, cells, amps, seed):
    out = np.zeros(x.shape, np.float32)
    for i, (cell, amp) in enumerate(zip(cells, amps)):
        if cell < 1.3:
            continue
        out += amp * vnoise(x, y, cell, seed + 17 * i, 0.7 * i + 0.3)
    return out


def gummi_source_height(base_r, rest_r):
    """hires pillow on the NPZ mask, then export-gummi.py crop, Lanczos half-scale, radial warp."""
    pack = np.load(NPZ)
    mask = pack['M']
    ccx = float(pack['ccx'])
    ccy = float(pack['ccy'])
    ys, xs = np.nonzero(mask > 0.5)
    bh = int(np.ceil(max(CY - ys.min(), ys.max() - CY) * 2 / 6)) + 2
    hh, hw = bh * 3, W_PT * 3
    q = min(1.0, 1400 / 2520)
    proxy = ndi.zoom(mask, q, order=1)
    inside = ndi.distance_transform_edt(proxy > 0.5)
    outside = ndi.distance_transform_edt(proxy <= 0.5)
    sd = (inside - outside + (proxy - 0.5)).astype(np.float32)
    radius = float(inside.max()) / q
    phi_proxy = np.clip(ndi.gaussian_filter(poisson_phi(proxy), 1), 0, 1)
    sd_f = ndi.spline_filter(sd.astype(np.float64), order=3)
    phi_f = ndi.spline_filter(phi_proxy.astype(np.float64), order=3)
    y0, y1 = CY - hh, CY + hh
    x0, x1 = CX - hw, CX + hw
    crop_m = mask[y0:y1, x0:x1]
    yy_c, xx_c = np.mgrid[y0:y1, x0:x1].astype(np.float32)
    py = (yy_c + 0.5) * q - 0.5
    px = (xx_c + 0.5) * q - 0.5
    sd_up = ndi.map_coordinates(sd_f, [py, px], order=3, prefilter=False, mode='nearest').astype(np.float32) / q
    phi = np.clip(ndi.map_coordinates(phi_f, [py, px], order=3, prefilter=False, mode='nearest'), 0, 1).astype(np.float32)
    # hires.render lines 138–139. Full-resolution edge, proxy distance inside.
    dl = ndi.distance_transform_edt(crop_m > 0.5).astype(np.float32)
    wv = sstep(0.4 * 64, 0.9 * 64, dl)
    dist = np.clip(dl * (1 - wv) + np.clip(sd_up, 0, None) * wv, 0, None)
    te = np.clip(phi / 0.6, 0, 1)
    ph = np.clip(phi, 0, 1)
    edge = np.clip(dist / (0.10 * radius), 0, 1)
    edge = np.sqrt(edge * (2 - edge))
    macro = 0.4 * radius * (0.75 * np.sqrt(1 - (1 - te) ** 2) + 0.25 * (1 - (1 - ph) ** 2.4)) * edge
    yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
    diameter = 1440
    detail = fbm(xx, yy, [0.12 * diameter], [0.0004 * diameter], 8)
    detail += fbm(xx, yy, [0.0022 * diameter, 0.0011 * diameter, 0.00055 * diameter], [8.8e-5 * diameter, 5.6e-5 * diameter, 3.2e-5 * diameter], 9)
    ramp = sstep(0.0, 0.004 * diameter, dist)
    height = (macro + detail * ramp).astype(np.float32)
    gy, gx = np.gradient(height)
    normal = np.stack([-gx, -gy, np.ones_like(gy)], -1)
    normal /= np.linalg.norm(normal, axis=-1, keepdims=True)
    small = np.asarray(Image.fromarray(height, 'F').resize((hw, hh), Image.Resampling.LANCZOS), np.float32)
    small_n = np.stack([
        np.asarray(Image.fromarray(normal[..., i], 'F').resize((hw, hh), Image.Resampling.LANCZOS), np.float32)
        for i in range(3)
    ], -1)
    th = theta()
    grid_y, grid_x = np.mgrid[0:MASTER, 0:MASTER].astype(np.float32)
    xx = grid_x / 3 - 200
    yy = grid_y / 3 - 200
    ang = np.arctan2(yy, xx)
    br = np.interp(ang, np.r_[th, np.pi], np.r_[base_r * W_PT, base_r[0] * W_PT])
    target = np.interp(ang, np.r_[th, np.pi], np.r_[rest_r, rest_r[0]])
    rat = br / np.maximum(target, 0.001)
    sy = (yy * rat + WARP_Y_OFFSET * W_PT) * 3
    sx = (xx * rat + 0.5 * W_PT) * 3
    warped = ndi.map_coordinates(small, [sy, sx], order=1, mode='nearest').astype(np.float32)
    warped_n = np.stack([
        ndi.map_coordinates(small_n[..., i], [sy, sx], order=1, mode='nearest') for i in range(3)
    ], -1).astype(np.float32)
    warped_n /= np.maximum(np.linalg.norm(warped_n, axis=-1, keepdims=True), 1e-8)
    meta = {
        'npz_sha256': sha256_file(NPZ),
        'ccx_offset': ccx,
        'ccy_offset': ccy,
        'centroid_minus_1260': [float(xs.mean() - CX), float(ys.mean() - CY)],
        'mapping': 'export-gummi.py lines 26-39. Center stays (1260,1260). ccx/ccy are recorded and not added.',
        'bh': bh,
        'small_center_y_half': hh / 2,
        'warp_center_y': WARP_Y_OFFSET * W_PT * 3,
        'R_canvas': radius,
        'crop': [int(y0), int(y1), int(x0), int(x1)],
    }
    return warped, warped_n, meta


def write_contact(frames, provenance, path):
    """Source, mathematical port, and amplified error. Not a Skia or device frame."""
    from PIL import ImageDraw, ImageFont
    thumb = 220
    label_h = 48
    cols = 6
    sheet = Image.new('RGB', (cols * thumb, label_h + len(frames) * (thumb + 16)), '#F8F6F2')
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    draw.text((8, 4), 'NOT A SKIA OR DEVICE FRAME  |  ' + provenance, fill='#111110', font=font)
    headers = ('source whole', 'port whole', 'error x8', 'source edge', 'port edge', 'error x8 edge')
    for i, header in enumerate(headers):
        draw.text((i * thumb + 6, 22), header, fill='#55524D', font=font)

    def fit(rgb):
        image = Image.fromarray(np.clip(np.round(rgb), 0, 255).astype(np.uint8))
        return image.resize((thumb, thumb), Image.Resampling.LANCZOS)

    def crop_at(rgb, y, x):
        half = 90
        y0, x0 = max(0, int(y) - half), max(0, int(x) - half)
        return rgb[y0:y0 + 2 * half, x0:x0 + 2 * half]

    for row, (name, ref, lit, per, edge) in enumerate(frames):
        if edge.any():
            pos = np.argwhere(edge)
            worst = pos[np.argmax(per[edge])]
        else:
            worst = np.array([MASTER // 2, MASTER // 2])
        tiles = (
            fit(ref), fit(lit), fit(np.stack([np.clip(per * 8, 0, 255)] * 3, -1)),
            fit(crop_at(ref, worst[0], worst[1])),
            fit(crop_at(lit, worst[0], worst[1])),
            fit(crop_at(np.stack([np.clip(per * 8, 0, 255)] * 3, -1), worst[0], worst[1])),
        )
        top = label_h + row * (thumb + 16)
        for i, tile in enumerate(tiles):
            sheet.paste(tile, (i * thumb, top))
        draw.rectangle((0, top, 70, top + 14), fill='#F8F6F2')
        draw.text((4, top + 2), name, fill='#111110', font=font)
        ey, ex = int(worst[0]), int(worst[1])
        draw.text((3 * thumb + 4, top + thumb - 14), f'max at ({ex},{ey})', fill='#F8F6F2', font=font)
    path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(path)


def main():
    base_r, rest_r = load_tables()
    report = {
        'evidence': 'mathematical-port',
        'skia_executed': False,
        'skia_reason': 'This environment has no Skia frame of DynamicMaterial. Color and normals are the Python port of shadeNormal and numpy.gradient, which is what the unmounted renderer uploads at 1 px.',
        'engineering_targets_not_visual_acceptance': {
            'interior_mae_8bit_lte': 2,
            'interior_max_8bit_lte': 8,
            'detail_ratio_gte': 0.9,
            'normal_p95_deg_lte': 2,
            'status': 'proposals from Pål, not design sign-off',
        },
        'sources': {
            'base_r_sha256': sha256_bytes(base_r.astype(np.float64).tobytes()),
            'base_r_0': float(base_r[0]),
            'rest_r_sha256': sha256_bytes(rest_r.astype(np.float64).tobytes()),
            'parameters_sha256': sha256_file(MAT / 'parameters-and-drift.json'),
            'bevel_seed': 47,
            'gummi_seed': 7,
            'export_grain_seed': 100,
            'skifer_aniso_deg': 18,
            'normal_step_px': 1,
            'previous_normal_step_px': 10,
        },
        'materials': {},
    }
    for name in ('skifer', 'kull', 'emalje', 'floyel'):
        print(name, flush=True)
        radii = radii_rest(base_r, name)
        mask = local_mask(radii)
        source, radius = source_bevel_height(mask, name)
        runtime = f16_load(SRC / f'height-{name}.f16.zlib', (MASTER, MASTER))
        row = compare_material(name, runtime, source, mask)
        row['R'] = radius
        row['height_sha256_f16'] = sha256_file(SRC / f'height-{name}.f16.zlib')
        report['materials'][name] = row
        if name == 'kull':
            dots = (np.random.default_rng(58).random((MASTER, MASTER)) < 0.0008).astype(np.float32)
            f16_save(SRC / 'glint-kull.f16.zlib', ndi.gaussian_filter(dots, 0.8))
        print(' ', row['color_8bit_vs_base_shade_light']['runtime_1px_interior_gt_12px'], flush=True)
    print('gummi', flush=True)
    warped, warped_n, meta = gummi_source_height(base_r, rest_r)
    f16_save(SRC / 'height-gummi.f16.zlib', warped)
    f16_save(SRC / 'normal-gummi-xy.f16.zlib', np.stack([warped_n[..., 0], warped_n[..., 1]], -1))
    xy = f16_load(SRC / 'normal-gummi-xy.f16.zlib', (MASTER, MASTER, 2))
    z = np.sqrt(np.clip(1 - xy[..., 0] ** 2 - xy[..., 1] ** 2, 0, 1))
    stored_n = np.stack([xy[..., 0], xy[..., 1], z], -1)
    runtime = f16_load(SRC / 'height-gummi.f16.zlib', (MASTER, MASTER))
    mask = local_mask(rest_r)
    row = compare_material('gummi', runtime, warped, mask, runtime_normals=stored_n)
    # Angle against the canvas 1 px normals after the same warp, not against a post-warp derivative.
    _, interior, edge = regions(mask)
    ang = angle_deg(stored_n, warped_n)
    row['normal_angle_deg_vs_source_1px']['runtime_1px'] = {**stats(ang[interior]), 'region': 'interior>12px'}
    row['normal_angle_deg_vs_source_1px']['runtime_1px_edge_0_12px'] = stats(ang[edge])
    height_n = normals_from(runtime)
    row['post_warp_height_gradient_vs_source_p95'] = stats(angle_deg(height_n, warped_n)[interior])['p95']
    row_height = compare_material('gummi', runtime, warped, mask)
    row['color_if_normals_come_from_warped_height'] = row_height['color_8bit_vs_base_shade_light']['runtime_1px_interior_gt_12px']
    row['R'] = meta['R_canvas']
    row['height_sha256_f16'] = sha256_file(SRC / 'height-gummi.f16.zlib')
    row['npz'] = meta
    row['normal_note'] = 'The 1 px angle is float16 rounding of the warped canvas normals. Differentiating the height after the warp is a different field.'
    edge = row['color_8bit_vs_base_shade_light']['runtime_1px_edge_0_12px']
    row['edge_investigation'] = {
        'kept_all_edge_pixels': True,
        'mae': edge['mae'],
        'p95': edge['p95'],
        'max': edge['max'],
        'count': edge['count'],
        'count_abs_gt_8': edge['count_abs_gt_8'],
        'count_abs_gt_15': edge['count_abs_gt_15'],
        'mean_signed_port_minus_source': edge['mean_signed_port_minus_source'],
        'cause': 'The tail is the steep rim after Lanczos and the radial warp. The port relights the warped albedo with the warped normal, and that BRDF is darker there than the exported light-screen. Shading on the canvas and then warping the color, and sampling canvas normals without Lanczos, both increase this max. The pixels stay in the score. It is not a mask cutoff and not the 2.94 px difference between 0.423·w·3 and half the crop.',
    }
    report['materials']['gummi'] = row
    def proposal(row):
        color = row['color_8bit_vs_base_shade_light']['runtime_1px_interior_gt_12px']
        ratio = row['detail_highpass_1_to_10px']['ratio_runtime_over_reference']
        p95 = row['normal_angle_deg_vs_source_1px']['runtime_1px']['p95']
        return {
            'mae': color['mae'] is not None and color['mae'] <= 2,
            'max': color['max'] is not None and color['max'] <= 8,
            'detail_ratio': ratio is not None and ratio >= 0.9,
            'normal_p95': p95 is not None and p95 <= 2,
        }
    report['engineering_diagnostic'] = {name: proposal(row) for name, row in report['materials'].items()}
    frames = []
    for name, row in report['materials'].items():
        ref, lit, per, edge = row.pop('_frames')
        frames.append((name, ref, lit, per, edge))
    sheet = ROOT / 'src/materials/fidelity-contact.png'
    write_contact(frames, f"BASE_R {report['sources']['base_r_sha256'][:12]}  parameters {report['sources']['parameters_sha256'][:12]}", sheet)
    OUT.write_text(json.dumps(report, indent=2))
    print(OUT, flush=True)
    print(sheet, flush=True)


if __name__ == '__main__':
    sys.exit(main())
