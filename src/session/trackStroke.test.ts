import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { HOLD_TO_END_MS } from '../data/copy.ts';
import {
  ARC_FILL_MS,
  TRACK_IN_MS,
  TRACK_OUT_MS,
  cubicBezier,
  drawProgress,
  strokeOpacity,
} from './trackStroke.ts';

describe('BOR-38 track stroke', () => {
  it('keeps the hold at 4 s and fills the arc across the remaining 3.85 s', () => {
    assert.equal(HOLD_TO_END_MS, 4000);
    assert.equal(TRACK_IN_MS, 150);
    assert.equal(TRACK_OUT_MS, 250);
    assert.equal(ARC_FILL_MS, 3850);
    assert.equal(drawProgress(0), 0);
    assert.equal(drawProgress(150), 0);
    assert.ok(Math.abs(drawProgress(150 + ARC_FILL_MS / 2) - 0.5) < 1e-9);
    assert.equal(drawProgress(4000), 1);
  });

  it('fades the track in with ease-out and out with ease-in, without rewinding', () => {
    assert.equal(strokeOpacity(false, 0, 0, -1, -1, false), 0);
    const at75 = cubicBezier(0.5, 0, 0, 0.58, 1);
    assert.ok(Math.abs(at75 - 0.68) < 0.02, `in ${at75}`);
    assert.ok(Math.abs(strokeOpacity(true, 75, 75, -1, -1, false) - at75) < 1e-9);
    assert.ok(Math.abs(strokeOpacity(true, 150, 150, -1, -1, false) - 1) < 1e-9);
    assert.equal(drawProgress(75), 0);
    const outAtHalf = cubicBezier(0.5, 0.42, 0, 1, 1);
    assert.ok(Math.abs(1 - outAtHalf - 0.68) < 0.02, `out ${1 - outAtHalf}`);
    const early = strokeOpacity(true, 75, 75 + 125, 75, -1, false);
    assert.ok(Math.abs(early - at75 * (1 - outAtHalf)) < 1e-6);
    assert.equal(strokeOpacity(true, 75, 75 + TRACK_OUT_MS, 75, -1, false), 0);
    assert.equal(drawProgress(75), 0);
    const frozen = drawProgress(2000);
    assert.ok(frozen > 0 && frozen < 1);
    assert.equal(drawProgress(2000), frozen);
  });

  it('snaps the track under Reduce Motion and still fills the arc linearly', () => {
    assert.equal(strokeOpacity(true, 10, 10, -1, -1, true), 1);
    assert.equal(strokeOpacity(true, 10, 11, 10, -1, true), 0);
    assert.equal(drawProgress(10), 0);
    assert.ok(Math.abs(drawProgress(150 + ARC_FILL_MS / 2) - 0.5) < 1e-9);
    assert.equal(strokeOpacity(true, 4000, 4000, -1, 4000, true), 1);
  });
});
