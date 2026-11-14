import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  MATERIAL_BLEND,
  MATERIAL_BODY_PX,
  MATERIAL_DIGIT_FONT,
  MATERIAL_IDS,
  MATERIAL_LAYERS,
  MATERIAL_SHA256,
  MATERIAL_SOURCE_SHA256,
  MATERIAL_TILE,
  REST_MASTER_REPLACES_SHIPPED_GUMMI,
  materialLocalMatrix,
  materialPlacement,
  materialRenderPlan,
  sourcePixelAt,
} from './restMaps.ts';

const ROOT = join(process.cwd(), 'assets/materials/2026-11-07');

function pngSize(path: string): { width: number; height: number; color: number } {
  const data = readFileSync(path);
  assert.equal(data.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20), color: data[25] };
}

describe('rest material maps', () => {
  it('places source center on the body center and keeps the artboard wider than the body', () => {
    const width = 240;
    const place = materialPlacement(width, 120, 80);
    assert.equal(place.ptPerPx, width / MATERIAL_BODY_PX);
    assert.equal(place.artboardPt, (400 * width) / 240);
    assert.ok(place.artboardPt > width);
    const center = sourcePixelAt(width, 120, 80, 120, 80);
    assert.ok(Math.abs(center.x - 600) < 1e-9);
    assert.ok(Math.abs(center.y - 600) < 1e-9);
    const origin = sourcePixelAt(width, 120, 80, place.tx, place.ty);
    assert.ok(Math.abs(origin.x) < 1e-6);
    assert.ok(Math.abs(origin.y) < 1e-6);
    const matrix = materialLocalMatrix(width, 120, 80);
    assert.equal(matrix.length, 9);
    assert.equal(matrix[8], 1);
  });

  it('stacks albedo, multiply, then screen, and does not call the base a finished material', () => {
    assert.deepEqual(MATERIAL_BLEND, ['srcOver', 'multiply', 'screen']);
    assert.equal(MATERIAL_TILE, 'clamp');
    assert.equal(MATERIAL_DIGIT_FONT, 'Figtree_400Regular');
    const missing = materialRenderPlan({ base: true, multiply: false, screen: false });
    assert.equal(missing.baseOnlyComplete, false);
    assert.equal(missing.restStack, false);
    assert.equal(missing.drawsLightOnBackground, false);
    assert.equal(missing.deformsLight, false);
    assert.equal(missing.darkRim, false);
    assert.equal(materialRenderPlan({ base: true, multiply: true, screen: true }).restStack, true);
    assert.equal(REST_MASTER_REPLACES_SHIPPED_GUMMI, false);
  });

  it('matches the exported 1200 RGB masters byte for byte', () => {
    for (const id of MATERIAL_IDS) {
      for (const layer of MATERIAL_LAYERS) {
        const path = join(ROOT, id, `${layer}.png`);
        const data = readFileSync(path);
        const hash = createHash('sha256').update(data).digest('hex');
        assert.equal(hash, MATERIAL_SHA256[id][layer], path);
        const size = pngSize(path);
        assert.equal(size.width, 1200);
        assert.equal(size.height, 1200);
        assert.equal(size.color, 2);
      }
    }
    assert.equal(MATERIAL_SOURCE_SHA256['hires.py'].length, 64);
  });

  it('leaves the shipped gummi rasters on the stones and keeps the rest stack unwired', () => {
    const klumpen = readFileSync(join(process.cwd(), 'src/components/Klumpen.tsx'), 'utf8');
    const session = readFileSync(join(process.cwd(), 'src/components/SessionKlumpen.tsx'), 'utf8');
    const home = readFileSync(join(process.cwd(), 'src/app/(tabs)/home.tsx'), 'utf8');
    const onboarding = readFileSync(join(process.cwd(), 'src/app/onboarding/name.tsx'), 'utf8');
    assert.match(klumpen, /klumpen-gummi-240pt\.png/);
    assert.match(klumpen, /MaterialShade/);
    assert.match(session, /MaterialShade/);
    assert.doesNotMatch(klumpen, /materials\/2026-11-07/);
    assert.doesNotMatch(klumpen, /shade-multiply|light-screen/);
    assert.doesNotMatch(session, /shade-multiply|light-screen/);
    assert.doesNotMatch(session, /RestMaterial/);
    assert.doesNotMatch(home, /RestMaterial/);
    assert.doesNotMatch(onboarding, /RestMaterial|MaterialShade|DynamicMaterial/);
    const view = readFileSync(join(process.cwd(), 'src/materials/RestMaterial.tsx'), 'utf8');
    assert.match(view, /blendMode=\{MATERIAL_BLEND\[1\]\}/);
    assert.match(view, /blendMode=\{MATERIAL_BLEND\[2\]\}/);
    assert.match(view, /clip=\{clip\}/);
    assert.match(view, /layer=\{<Paint/);
    assert.match(view, /tabular-nums/);
    assert.doesNotMatch(view, /materialpicker|MaterialPicker/);
  });
});
