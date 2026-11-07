import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  DARK_RIM_AGAINST,
  DARK_RIM_TARGET_CONTRAST,
  DARK_RIM_UNSET,
  ENV_LIGHT,
  FBM_MIN_CELL,
  GUMMI_HR_ALB_VAR_AMP_SUPERSEDED,
  GUMMI_HR_GRAIN_AMP_SUPERSEDED,
  GUMMI_SOURCE_D,
  PATH_LIGHT_SKSL,
  PROFILES,
  analyticDiskPhi,
  bevelHeight,
  buildField,
  contrastRatio,
  darkRimReady,
  diskMask,
  fieldRadius,
  gradient,
  gummiGrainSurvivesAtSourceD,
  hash01,
  insideDistance,
  pillowHeight,
  poreDarkening,
  shadeNormal,
  spotsAt,
  unitLight,
} from './pathLight.ts';

describe('path-dependent material light', () => {
  it('keeps the source light vector and the JSON gummi overrides', () => {
    assert.deepEqual(ENV_LIGHT.L, [-0.42, -0.62, 0.66]);
    assert.equal(ENV_LIGHT.key, 0.75);
    assert.equal(ENV_LIGHT.amb, 0.35);
    assert.equal(ENV_LIGHT.rim, 0);
    const L = unitLight();
    assert.ok(Math.abs(Math.hypot(L.x, L.y, L.z) - 1) < 1e-12);
    const gummi = PROFILES.gummi;
    assert.equal(gummi.kind, 'pillow');
    if (gummi.kind !== 'pillow') return;
    assert.deepEqual(gummi.grainAmp, [8.8e-5, 5.6e-5, 3.2e-5]);
    assert.deepEqual(gummi.albVarAmp, [0.03, 0.035]);
    assert.notDeepEqual(gummi.grainAmp, GUMMI_HR_GRAIN_AMP_SUPERSEDED);
    assert.notDeepEqual(gummi.albVarAmp, GUMMI_HR_ALB_VAR_AMP_SUPERSEDED);
    assert.equal(gummi.box, 0);
    assert.equal(gummi.envRefl, 0.12);
    assert.equal(gummi.refl, 0.4);
    assert.equal(gummi.f0, 0.03);
    const emalje = PROFILES.emalje;
    assert.equal(emalje.kind, 'bevel');
    if (emalje.kind !== 'bevel') return;
    assert.equal(emalje.box, 0.4);
    assert.equal(emalje.boxW, 0.17);
    assert.equal(emalje.det, 0.00002);
    assert.equal(emalje.detailApplied, false);
  });

  it('gives a disk pillow height 0 at the rim and 0.4R at the analytic center', () => {
    const radius = 10;
    assert.equal(analyticDiskPhi(0, radius), 1);
    assert.equal(analyticDiskPhi(radius, radius), 0);
    assert.ok(Math.abs(analyticDiskPhi(radius / 2, radius) - 0.75) < 1e-12);
    assert.equal(pillowHeight(0, radius, 1), 0);
    const center = pillowHeight(radius, radius, analyticDiskPhi(0, radius));
    assert.ok(Math.abs(center - 0.4 * radius) < 1e-12);
  });

  it('solves a disk Poisson field that is not a stored bevel SDF', () => {
    const size = 31;
    const radius = 10;
    const mask = diskMask(size, radius);
    const dist = insideDistance(mask, size, size);
    const R = fieldRadius(dist);
    const field = buildField(mask, size, size, 'gummi');
    const c = (size - 1) / 2;
    const center = Math.round(c);
    const i = center * size + center;
    assert.ok(field.phi[i] > 0.5);
    assert.equal(field.heightMap[0], 0);
    let outside = 0;
    let disagree = 0;
    for (let p = 0; p < mask.length; p += 1) {
      if (!mask[p]) {
        assert.equal(field.phi[p], 0);
        outside += 1;
        continue;
      }
      const x = p % size;
      const y = Math.floor(p / size);
      const rho = Math.hypot(x - c, y - c);
      const analytic = analyticDiskPhi(rho, radius);
      if (Math.abs(field.phi[p] / Math.max(field.phi[i], 1e-6) - analytic) > 0.2 && rho < radius - 2) disagree += 1;
    }
    assert.ok(outside > 0);
    assert.ok(R > 0);
    // Grid φ is the PDE solution. A bevel SDF is dist/R. They must not be the same field.
    let sdfGap = 0;
    for (let p = 0; p < mask.length; p += 1) {
      if (!mask[p] || dist[p] <= 0) continue;
      sdfGap = Math.max(sdfGap, Math.abs(field.phi[p] - dist[p] / R));
    }
    assert.ok(sdfGap > 0.05, `phi vs dist/R gap ${sdfGap}`);
    assert.ok(disagree < mask.length);
  });

  it('does not treat a rectangle Poisson field as its distance field', () => {
    const width = 28;
    const height = 14;
    const mask = new Uint8Array(width * height);
    for (let y = 2; y < height - 2; y += 1) {
      for (let x = 2; x < width - 2; x += 1) mask[y * width + x] = 1;
    }
    const field = buildField(mask, width, height, 'gummi');
    const dist = field.dist;
    const R = field.radius;
    let gap = 0;
    for (let i = 0; i < mask.length; i += 1) {
      if (!mask[i]) continue;
      gap = Math.max(gap, Math.abs(field.phi[i] - dist[i] / R));
    }
    assert.ok(gap > 0.05, `rectangle gap ${gap}`);
    const mid = Math.floor(height / 2) * width + Math.floor(width / 2);
    const bridge = Math.floor(height / 2) * width + 4;
    assert.ok(field.phi[mid] > field.phi[bridge]);
  });

  it('uses a direct gradient on the pillow and the bevel profile on Emalje', () => {
    const width = 5;
    const height = new Float32Array([0, 1, 2, 3, 4]);
    const g = gradient(height, width, 1);
    assert.equal(g.gx[2], 1);
    assert.equal(g.gy[2], 0);
    const emalje = PROFILES.emalje;
    if (emalje.kind !== 'bevel') return;
    const R = 10;
    const full = bevelHeight(R, R, emalje.bevel, emalje.hs, emalje.crown);
    assert.ok(Math.abs(full - (emalje.bevel * R * emalje.hs + emalje.crown * R)) < 1e-12);
    assert.equal(bevelHeight(0, R, emalje.bevel, emalje.hs, emalje.crown), 0);
    assert.equal(emalje.heightBlur, 0.6);
    assert.equal(PROFILES.gummi.kind === 'pillow' && PROFILES.gummi.hs, 0.4);
  });

  it('matches the flat-normal gummi expansion and drops the sub-pixel grain octave at D=1440', () => {
    const L = unitLight();
    const flat = shadeNormal('gummi', { x: 0, y: 0, z: 1 });
    const alb = { r: 0x1a, g: 0x1a, b: 0x19 };
    const diffuse = ENV_LIGHT.amb * 1 + ENV_LIGHT.key * 0.6;
    const rdl = L.z;
    const spec = rdl ** 2.6 * 0.07 * 255;
    const floorK = 0.03 * 0.12;
    const floor = { r: 0xf0, g: 0xed, b: 0xe7 };
    assert.ok(Math.abs(diffuse - 0.8) < 1e-12);
    assert.ok(Math.abs(flat.r - (alb.r * diffuse + spec + floorK * floor.r)) < 1e-9);
    assert.ok(Math.abs(flat.g - (alb.g * diffuse + spec + floorK * floor.g)) < 1e-9);
    const kept = gummiGrainSurvivesAtSourceD();
    assert.deepEqual(kept, [true, true, false]);
    assert.equal(FBM_MIN_CELL, 1.3);
    assert.equal(0.00055 * GUMMI_SOURCE_D < FBM_MIN_CELL, true);
    assert.equal(spotsAt(0, 0, 10, 1, 0.2, 0.5, 7), 0);
    assert.equal(poreDarkening(0), 1);
    assert.ok(poreDarkening(1) < 1);
    assert.ok(hash01(1, 2, 7) > 0 && hash01(1, 2, 7) < 1);
    assert.equal(hash01(1, 2, 7), hash01(1, 2, 7));
  });

  it('leaves the dark rim unset and does not mount the shader on a screen', () => {
    assert.equal(darkRimReady(DARK_RIM_UNSET), false);
    assert.equal(DARK_RIM_TARGET_CONTRAST, 3);
    assert.ok(contrastRatio(DARK_RIM_AGAINST, DARK_RIM_AGAINST) === 1);
    assert.ok(contrastRatio('#F8F6F2', DARK_RIM_AGAINST) > 3);
    assert.match(PATH_LIGHT_SKSL, /uniform shader albedo/);
    assert.match(PATH_LIGHT_SKSL, /uniform shader normals/);
    assert.doesNotMatch(PATH_LIGHT_SKSL, /shade-multiply|light-screen/);
    const view = readFileSync(join(process.cwd(), 'src/materials/DynamicMaterial.tsx'), 'utf8');
    const klumpen = readFileSync(join(process.cwd(), 'src/components/Klumpen.tsx'), 'utf8');
    const home = readFileSync(join(process.cwd(), 'src/app/(tabs)/home.tsx'), 'utf8');
    assert.match(view, /base\.png/);
    assert.doesNotMatch(view, /shade-multiply|light-screen/);
    assert.match(view, /darkRimReady/);
    assert.match(klumpen, /klumpen-gummi-240pt\.png/);
    assert.doesNotMatch(home, /DynamicMaterial/);
    assert.doesNotMatch(klumpen, /DynamicMaterial/);
  });
});
