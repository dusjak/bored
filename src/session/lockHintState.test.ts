import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  bulgeDepth,
  lockHintSettled,
  lockHintState,
  remainingLabelOpacity,
} from './lockHintState.ts';

const near = (actual: number, expected: number, epsilon = 1e-6) => {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} is not within ${epsilon} of ${expected}`);
};

describe('lock hint state', () => {
  it('stays still for the first four seconds', () => {
    const frame = lockHintState(0, false, false, null, false);
    assert.equal(frame.p, 0);
    assert.equal(frame.ov, 0);
    assert.equal(frame.textA, 0);
    assert.equal(frame.g, 0);
    assert.equal(frame.breath, 0);
    const atFour = lockHintState(4000, false, false, null, false);
    assert.equal(atFour.p, 0);
    assert.equal(atFour.ov, 0);
    assert.equal(atFour.textA, 0);
  });

  it('has the bulge and the scrim in by 4.6 s, with the glow still off', () => {
    const frame = lockHintState(4600, false, false, null, false);
    near(frame.p, 1);
    near(frame.ov, 1);
    near(frame.vis, 1);
    near(frame.g, 0);
    near(frame.breath, 0);
    assert.ok(frame.textA > 0.99);
    near(frame.textDx, 0, 0.02);
  });

  it('ramps the glow with easeInQuad, about 40% at 15 s and full at 19 s', () => {
    const atEight = lockHintState(8000, false, false, null, false);
    const atFifteen = lockHintState(15000, false, false, null, false);
    const atNineteen = lockHintState(19000, false, false, null, false);
    near(atEight.g, 0);
    near(atFifteen.g, (7000 / 11000) ** 2);
    assert.ok(atFifteen.g > 0.4 && atFifteen.g < 0.41);
    near(atNineteen.g, 1);
    assert.equal(atNineteen.glowOn, true);
  });

  it('breathes on a 3 s cycle after the bulge has emerged', () => {
    const justOut = lockHintState(4600, false, false, null, false);
    const halfBreath = lockHintState(4600 + 1500, false, false, null, false);
    near(justOut.breath, 0);
    near(halfBreath.breath, 1, 1e-4);
  });

  it('pulls the hint back in at 34 s', () => {
    const before = lockHintState(33700, false, false, null, false);
    const atRetract = lockHintState(34000, false, false, null, false);
    const after = lockHintState(34500, false, false, null, false);
    assert.ok(before.textA > 0.99);
    near(atRetract.textA, 0);
    near(atRetract.p, 1);
    near(after.p, 0);
    near(after.ov, 0);
    assert.equal(lockHintSettled(34500, after, null, false), true);
    assert.equal(lockHintSettled(34000, atRetract, null, false), false);
  });

  it('closes on a tap without starting a hold: text, bulge, then scrim', () => {
    const tap = 12000;
    const mid = lockHintState(12150, false, false, tap, false);
    const done = lockHintState(12400, false, false, tap, false);
    near(mid.textA, 0);
    near(mid.ov, 0.5);
    near(mid.p, 1 - (150 / 350) ** 3);
    near(done.p, 0);
    near(done.ov, 0);
    assert.equal(lockHintSettled(12400, done, tap, false), true);
  });

  it('keeps a static shape under reduce motion and caps the glow at 60%', () => {
    const fading = lockHintState(4100, true, false, null, false);
    const full = lockHintState(15000, true, false, null, false);
    near(fading.vis, 0.5);
    assert.equal(fading.p, 1);
    assert.equal(fading.breath, 0);
    assert.equal(fading.textDx, 0);
    near(full.g, (7000 / 11000) ** 2 * 0.6);
    const tapped = lockHintState(12200, true, false, 12000, false);
    near(tapped.vis, 0);
    assert.equal(tapped.p, 0);
  });

  it('drops the glow when contrast is on, and holds the hint for a screen reader', () => {
    const contrast = lockHintState(19000, false, true, null, false);
    assert.equal(contrast.glowOn, false);
    near(contrast.g, 1);
    const held = lockHintState(40000, false, false, null, true);
    near(held.p, 1);
    near(held.ov, 1);
    assert.ok(held.textA > 0.99);
    assert.equal(lockHintSettled(40000, held, null, true), false);
  });

  it('fades «gjenstår» out with the first half of the scrim', () => {
    near(remainingLabelOpacity(0), 1);
    near(remainingLabelOpacity(0.25), 0.5);
    near(remainingLabelOpacity(0.5), 0);
    near(remainingLabelOpacity(1), 0);
  });

  it('matches the super-gaussian depth at the button and falls off past the meniscus', () => {
    const full = bulgeDepth(228, 228, 1, 0);
    near(full, 5.5);
    const peakBreath = bulgeDepth(228, 228, 1, 1);
    near(peakBreath, 5.5 * 1.18);
    const far = bulgeDepth(228 + 80, 228, 1, 0);
    assert.ok(far < 0.05);
    assert.equal(bulgeDepth(228, 228, 0, 0), 0);
  });
});
