import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { STONE_NUMBER_COLOR } from '../duration/klumpen.ts';
import {
  ENGRAVE,
  ENGRAVED_DIGIT_COLOR,
  ENGRAVED_FONT,
  NUMBER_CENTER_FROM_CY,
  UNIT_CENTER_FROM_CY,
} from './engraving.ts';

describe('engraved numerals', () => {
  it('is Gravert v2 at Figtree 400, with the pair 4 pt tighter and still centered', () => {
    assert.equal(ENGRAVED_DIGIT_COLOR, '#F8F6F2');
    assert.equal(ENGRAVED_DIGIT_COLOR, STONE_NUMBER_COLOR);
    assert.equal(ENGRAVED_FONT, 'Figtree_400Regular');
    assert.equal(NUMBER_CENTER_FROM_CY, -9);
    assert.equal(UNIT_CENTER_FROM_CY, 23);
    assert.equal(UNIT_CENTER_FROM_CY - NUMBER_CENTER_FROM_CY, 32);
    assert.equal((NUMBER_CENTER_FROM_CY + UNIT_CENTER_FROM_CY) / 2, 7);
    assert.ok(Math.abs(ENGRAVE.soften - 0.2) < 1e-9);
    assert.ok(Math.abs(ENGRAVE.innerShift - 4 / 3) < 1e-9);
    assert.equal(ENGRAVE.innerStrength, 0.4);
    assert.equal(ENGRAVE.darkStrength, 0.5);
    assert.ok(Math.abs(ENGRAVE.lightStrength - 0.15) < 1e-9);
  });

  it('draws that cut on the live stone and on Hjem without a per-frame text loop', () => {
    const root = process.cwd();
    const live = readFileSync(join(root, 'src/components/LiveKlump.tsx'), 'utf8');
    const home = readFileSync(join(root, 'src/components/Klumpen.tsx'), 'utf8');
    assert.match(live, /ENGRAVED_DIGIT_COLOR/);
    assert.match(live, /ENGRAVED_SHADOW/);
    assert.match(live, /fontFamily: theme\.fonts\.sans/);
    assert.match(live, /tabular-nums/);
    assert.match(live, /Figtree_400Regular/);
    assert.doesNotMatch(live, /useFrameCallback/);
    assert.match(home, /PinnedEngraving/);
    assert.match(home, /NUMBER_CENTER_FROM_CY/);
    assert.match(home, /UNIT_CENTER_FROM_CY/);
  });
});
