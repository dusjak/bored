import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { KLUMPEN_RADII, savedSessionRadii } from './klumpenShape.ts';
import { emptyOffsets, FORM_BINS } from '../onboarding/formShape.ts';

describe('saved form on Hjem and the session', () => {
  it('keeps the base silhouette when nothing was dragged', () => {
    assert.equal(savedSessionRadii(null), null);
    assert.equal(savedSessionRadii(emptyOffsets()), null);
  });

  it('moves the session samples when a sector was pushed out', () => {
    const offsets = emptyOffsets();
    offsets[0] = 40;
    const radii = savedSessionRadii(offsets);
    assert.ok(radii);
    assert.equal(radii.length, KLUMPEN_RADII.length);
    assert.equal(radii.length, 180);
    assert.equal(radii.some((radius, index) => Math.abs(radius - KLUMPEN_RADII[index]) > 2), true);
  });

  it('reads the saved material on Hjem and the session, and draws gjenstår', () => {
    const root = process.cwd();
    const home = readFileSync(join(root, 'src/app/(tabs)/home.tsx'), 'utf8');
    const session = readFileSync(join(root, 'src/app/session.tsx'), 'utf8');
    const klumpen = readFileSync(join(root, 'src/components/Klumpen.tsx'), 'utf8');
    const stone = readFileSync(join(root, 'src/components/SessionKlumpen.tsx'), 'utf8');
    assert.doesNotMatch(home, /formOffsets=\{user\.forms/);
    assert.match(home, /<HomeKlumpen/);
    assert.match(session, /\{REMAINING_LABEL\}/);
    assert.doesNotMatch(session, /formOffsets=\{stoneForm\}/);
    assert.match(klumpen, /useLiveMaterial\(material/);
    assert.match(klumpen, /useCachedStoneImage/);
    assert.match(stone, /keepGummiRaster = true/);
    assert.match(stone, /klumpen-okt-hvile\.png/);
    assert.equal(FORM_BINS, 48);
  });
});
