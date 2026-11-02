import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { features, isSplashReplayEnabled } from './features.ts';

describe('features', () => {
  it('plays the Sluket animation unless the kill switch is flipped', () => {
    assert.equal(features.sluketAnimation, true);
  });

  it('keeps the AI card off by default', () => {
    assert.equal(features.aiCard, false);
  });

  it('keeps the paint-mix pass on so it can be switched off in one place', () => {
    assert.equal(features.sluketColorMix, true);
  });

  it('replays Sluket from the account button only outside production', () => {
    assert.equal(isSplashReplayEnabled(true, 'production'), true);
    assert.equal(isSplashReplayEnabled(true, null), true);
    assert.equal(isSplashReplayEnabled(false, 'preview'), true);
    assert.equal(isSplashReplayEnabled(false, 'development'), true);
    assert.equal(isSplashReplayEnabled(false, 'production'), false);
    assert.equal(isSplashReplayEnabled(false, null), false);
    assert.equal(isSplashReplayEnabled(false, ''), false);
  });
});
