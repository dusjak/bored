import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { features } from './features.ts';

describe('features', () => {
  it('plays the Sluket animation unless the kill switch is flipped', () => {
    assert.equal(features.sluketAnimation, true);
  });
});
