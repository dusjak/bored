import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { planCountdownUpgrade, shouldWriteDefaultCountdownOff, showCountdownFromStored } from './showCountdown.ts';

describe('show countdown preference', () => {
  it('keeps an explicit on or off choice', () => {
    assert.equal(showCountdownFromStored('1', false), true);
    assert.equal(showCountdownFromStored('1', true), true);
    assert.equal(showCountdownFromStored('0', false), false);
    assert.equal(showCountdownFromStored('0', true), false);
    assert.equal(shouldWriteDefaultCountdownOff('1', false), false);
    assert.equal(shouldWriteDefaultCountdownOff('0', true), false);
  });

  it('defaults a new install to off and writes that once', () => {
    assert.equal(showCountdownFromStored(null, false), false);
    assert.equal(shouldWriteDefaultCountdownOff(null, false), true);
    assert.equal(shouldWriteDefaultCountdownOff('', false), true);
  });

  it('does not change an existing install that never stored a choice', () => {
    assert.equal(showCountdownFromStored(null, true), true);
    assert.equal(shouldWriteDefaultCountdownOff(null, true), false);
    const plan = planCountdownUpgrade(null, true);
    assert.equal(plan.show, true);
    assert.equal(plan.writeDefaultOff, false);
    assert.deepEqual(planCountdownUpgrade('1', true), { show: true, writeDefaultOff: false });
    assert.deepEqual(planCountdownUpgrade('0', true), { show: false, writeDefaultOff: false });
  });
});
