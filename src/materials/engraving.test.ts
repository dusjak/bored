import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { STONE_NUMBER_COLOR } from '../duration/klumpen.ts';
import { ENGRAVED_DIGIT_COLOR, ENGRAVED_FONT, ENGRAVED_SHADOW } from './engraving.ts';

describe('engraved numerals', () => {
  it('is white Figtree 400 with a one-point dark cut, not a glow', () => {
    assert.equal(ENGRAVED_DIGIT_COLOR, '#F8F6F2');
    assert.equal(ENGRAVED_DIGIT_COLOR, STONE_NUMBER_COLOR);
    assert.equal(ENGRAVED_FONT, 'Figtree_400Regular');
    assert.equal(ENGRAVED_SHADOW.textShadowOffset.width, 1);
    assert.equal(ENGRAVED_SHADOW.textShadowOffset.height, 1);
    assert.equal(ENGRAVED_SHADOW.textShadowRadius, 1);
    assert.match(String(ENGRAVED_SHADOW.textShadowColor), /0,\s*0,\s*0/);
    assert.doesNotMatch(String(ENGRAVED_SHADOW.textShadowColor), /248,\s*246,\s*242/);
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
    assert.match(home, /ENGRAVED_SHADOW/);
    assert.match(home, /numberFamily \?\? hero\.fontFamily/);
  });
});
