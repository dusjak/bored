import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { features } from './features.ts';

describe('features', () => {
  it('keeps the Sluket animation off', () => {
    assert.equal(features.sluketAnimation, false);
  });
});
