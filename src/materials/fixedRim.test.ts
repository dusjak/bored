import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { RIM_BLUR_PT, RIM_EROSION_PT, RIM_GAIN, RIM_SHIFT_PT } from './pathLight.ts';
import {
  RIM_BLUR_X_SKSL,
  RIM_EDGE_SAMPLE_RADIUS_PT,
  RIM_EDGE_SKSL,
  RIM_EROSION_STEPS,
  RIM_GAUSS_WEIGHTS,
  RIM_TINT_SKSL,
} from './fixedRim.ts';
import { MICRO_PACK } from './microPack.ts';
import { readMaterialStatus, reportMaterialStatus, resetMaterialStatusForTests } from './materialStatus.ts';

describe('bundled micro offset and the fixed-point rim', () => {
  it('packs every material and keeps the rim lengths in points', () => {
    for (const id of ['gummi', 'skifer', 'kull', 'emalje', 'floyel'] as const) {
      const pack = MICRO_PACK[id];
      assert.ok(pack.half > 0);
      const x = readFileSync(join(process.cwd(), 'assets/materials/2026-11-07', id, 'micro-x.png'));
      const y = readFileSync(join(process.cwd(), 'assets/materials/2026-11-07', id, 'micro-y.png'));
      assert.equal(createHash('sha256').update(x).digest('hex'), pack.xSha256);
      assert.equal(createHash('sha256').update(y).digest('hex'), pack.ySha256);
    }
    assert.equal(RIM_EROSION_PT, 4 / 3);
    assert.equal(RIM_BLUR_PT, 2 / 3);
    assert.equal(RIM_SHIFT_PT, 3);
    assert.equal(RIM_GAIN, 1.6);
    assert.equal(RIM_EROSION_STEPS, 4);
    assert.equal(RIM_EDGE_SAMPLE_RADIUS_PT, 3);
    assert.match(RIM_EDGE_SKSL, /float2\(3\.0, 3\.0\)/);
    assert.match(RIM_TINT_SKSL, /1\.6/);
    const weight = RIM_GAUSS_WEIGHTS.reduce((sum, value) => sum + value, 0);
    assert.ok(Math.abs(weight - 1) < 1e-9);
    assert.match(RIM_BLUR_X_SKSL, /edge\.eval/);
    const view = readFileSync(join(process.cwd(), 'src/materials/DynamicMaterial.tsx'), 'utf8');
    const klumpen = readFileSync(join(process.cwd(), 'src/components/Klumpen.tsx'), 'utf8');
    assert.match(view, /micro-x\.png/);
    assert.match(view, /makeFixedRimFilter/);
    assert.match(view, /microHalf/);
    assert.match(klumpen, /FixedRim/);
    assert.match(klumpen, /usePathValue/);
    assert.doesNotMatch(view, /LIVE_RIM_CAP/);
  });

  it('warns once when the live material falls back', () => {
    resetMaterialStatusForTests();
    const warnings: string[] = [];
    const original = console.warn;
    console.warn = (...args: unknown[]) => {
      warnings.push(args.map(String).join(' '));
    };
    try {
      reportMaterialStatus('hjem', { phase: 'fallback', reason: 'fixed-rim-shader' });
      reportMaterialStatus('hjem', { phase: 'fallback', reason: 'fixed-rim-shader' });
      reportMaterialStatus('hjem', { phase: 'live', reason: 'macro-micro-fixed-rim' });
    } finally {
      console.warn = original;
    }
    assert.deepEqual(warnings, ['[bored:material] hjem fallback: fixed-rim-shader']);
    assert.equal(readMaterialStatus('hjem')?.phase, 'live');
  });
});
