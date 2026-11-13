import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { features } from './features.ts';

describe('features', () => {
  it('plays the Sluket animation unless the kill switch is flipped', () => {
    assert.equal(features.sluketAnimation, true);
  });

  it('keeps the AI card off by default', () => {
    assert.equal(features.aiCard, false);
  });

  it('holds MegaSplash and keeps the player behind the flag', () => {
    assert.equal(features.megaSplash, false);
  });

  it('keeps the paint-mix pass on so it can be switched off in one place', () => {
    assert.equal(features.sluketColorMix, true);
  });
});
