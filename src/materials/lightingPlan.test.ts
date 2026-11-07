import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { contourInPoints, deform, emptyOffsets } from '../onboarding/formShape.ts';
import { planFormLighting, type LightingCache } from './lightingPlan.ts';

describe('form lighting plan', () => {
  it('rebuilds on settle and release, not on each pointer move', () => {
    const start = emptyOffsets();
    const keys = [`160:${start.join(',')}`];
    for (let step = 0; step < 24; step += 1) {
      const next = deform({
        start,
        material: 'gummi',
        minutes: 10,
        widthPt: 160,
        travelPt: 12 + step,
        angle: 0.4,
      });
      keys.push(`160:${next.offsets.join(',')}`);
    }
    const first = contourInPoints(start, 160);
    const last = contourInPoints(
      keys[keys.length - 1].slice(4).split(',').map(Number),
      160,
    );
    assert.equal(
      last.some((point, index) => point.x !== first[index]?.x || point.y !== first[index]?.y),
      true,
    );
    assert.notEqual(keys[keys.length - 1], keys[0]);

    let cache: LightingCache | null = null;
    let generation: string | null = null;
    let macros = 0;
    let rims = 0;
    const apply = (holding: boolean, shapeKey: string, material: string) => {
      const plan = planFormLighting({ holding, material, shapeKey, cache });
      if (plan.generation !== generation) {
        if (plan.rebuildMacro) macros += 1;
        if (plan.refitRim) rims += 1;
      }
      cache = plan.cache;
      generation = plan.generation;
      return plan;
    };

    const settled = apply(false, keys[0], 'gummi');
    for (let i = 1; i < keys.length; i += 1) {
      const plan = apply(true, keys[i], 'gummi');
      assert.equal(plan.rebuildMacro, false);
      assert.equal(plan.refitRim, false);
      assert.equal(plan.generation, settled.generation);
    }
    const released = apply(false, keys[keys.length - 1], 'gummi');
    assert.equal(released.rebuildMacro, true);
    assert.equal(released.refitRim, true);
    assert.equal(macros, 2);
    assert.equal(rims, 2);

    const again = apply(false, keys[keys.length - 1], 'gummi');
    assert.equal(again.rebuildMacro, false);
    assert.equal(again.refitRim, false);

    const switched = apply(false, keys[keys.length - 1], 'floyel');
    assert.equal(switched.rebuildMacro, true);
    assert.equal(switched.refitRim, true);
    assert.notEqual(switched.generation, again.generation);

    const legacy = apply(false, keys[0], 'kull');
    assert.equal(legacy.rebuildMacro, true);
    assert.equal(legacy.cache.material, 'kull');
  });

  it('wires the hold into the form stone and leaves the session path alone', () => {
    const root = process.cwd();
    const form = readFileSync(join(root, 'src/app/onboarding/form.tsx'), 'utf8');
    const stone = readFileSync(join(root, 'src/components/LiveKlump.tsx'), 'utf8');
    const hook = readFileSync(join(root, 'src/materials/DynamicMaterial.tsx'), 'utf8');
    const session = readFileSync(join(root, 'src/components/SessionKlumpen.tsx'), 'utf8');
    assert.match(form, /holdLighting=\{holdingRef\.current \|\| holding\}/);
    assert.match(form, /holdingRef\.current = true/);
    assert.match(form, /holdingRef\.current = false/);
    assert.match(stone, /planFormLighting/);
    assert.match(stone, /plan\.generation/);
    assert.match(stone, /if \(plan\.rebuildMacro\) lightClip\.current = fill/);
    assert.match(hook, /const fieldKey = lightingKey \?\? clip/);
    assert.match(hook, /makeFixedRimFilter\(uploaded\.rimK\)/);
    assert.doesNotMatch(session, /planFormLighting/);
    assert.match(session, /useLiveMaterial/);
  });
});
