import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { KLUMPEN_PATH } from '../components/klumpenPath.ts';
import { GUMMI_WARP_TABLES, SOURCE_BG, SOURCE_SBG, gummiWarpPixel } from './pathLight.ts';
import { masterHeightAt, masterToCanvas, masterToStone, masterWarp, sourceFbm } from './sourceParity.ts';
import { SOURCE_BASE_R } from './sourceTables.ts';

describe('source parity of the rest warp and height', () => {
  it('matches shape.json svg_path to KLUMPEN_PATH, including at 02349851', () => {
    const sha = createHash('sha256').update(KLUMPEN_PATH).digest('hex');
    assert.equal(sha, 'd85c9b5c3dc0a5d919d70346dcc30af4733f1d7880827219422b28cfdfdded1b');
    assert.equal(KLUMPEN_PATH.length, 1736);
    const home = readFileSync(join(process.cwd(), 'src/app/(tabs)/home.tsx'), 'utf8');
    assert.doesNotMatch(home, /DynamicMaterial/);
  });

  it('uses the shape_mask BASE_R and the rest radii in the warp', () => {
    assert.equal(SOURCE_BG, '#F8F6F2');
    assert.equal(SOURCE_SBG, '#0A0A09');
    assert.equal(SOURCE_BASE_R.length, 720);
    assert.ok(Math.abs(SOURCE_BASE_R[0] - 0.4866666666666667) < 1e-15);
    assert.equal(gummiWarpPixel(900, 600, GUMMI_WARP_TABLES)?.sx !== undefined, true);
    const warp = masterWarp(900, 600);
    const mapped = gummiWarpPixel(900, 600, GUMMI_WARP_TABLES);
    assert.ok(mapped);
    assert.ok(Math.abs(mapped.sx - warp.sx) < 1e-6);
    assert.ok(Math.abs(mapped.sy - warp.sy) < 1e-6);
    assert.ok(Math.abs(warp.sx - 660.0924920029585) < 1e-6);
    assert.ok(Math.abs(warp.sy - 304.56) < 1e-9);
    const stone = masterToStone(900, 600);
    assert.ok(Math.abs(stone.x - 650.0770766691321) < 1e-6);
    assert.ok(Math.abs(stone.y - 400) < 1e-9);
    const canvas = masterToCanvas(600, 600);
    assert.ok(Math.abs(canvas.x - 1260) < 1e-6);
    assert.ok(Math.abs(canvas.y - 1260) < 1e-6);
    const und = sourceFbm(1260, 1260, [0.12 * 1440], [0.0004], 8);
    assert.ok(Math.abs(und - 0.00015862397424172773) < 1e-12);
  });

  it('reads the NumPy height, including the Skifer 18° detail, and the stone pillow', () => {
    const skifer = masterHeightAt('skifer', 600, 600);
    assert.ok(Math.abs(skifer - 15.5078125) < 1e-4);
    assert.ok(Math.abs(skifer - 16.495777130126953) > 0.5);
    const emalje = masterHeightAt('emalje', 600, 600);
    assert.ok(Math.abs(emalje - 82.4375) < 1e-3);
    const gummi = masterHeightAt('gummi', 600, 600);
    assert.ok(gummi > 100);
    const view = readFileSync(join(process.cwd(), 'src/materials/DynamicMaterial.tsx'), 'utf8');
    assert.match(view, /masterNormals/);
    assert.match(view, /NORMAL_PX = SOURCE_MASTER/);
    assert.doesNotMatch(view, /const FIELD = 120/);
  });
});
