import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { FORM_BINS, REST_RADII, emptyOffsets } from './formShape.ts';
import { followOffsets, radialCage, smoothClosed } from './formMotion.ts';

describe('shaping motion', () => {
  it('eases toward the finger instead of jumping', () => {
    const current = emptyOffsets();
    const target = emptyOffsets();
    target[3] = 40;
    const step = followOffsets(current, target, 0.5);
    assert.equal(step.next[3], 20);
    assert.ok(step.remaining > 0);
    const done = followOffsets(target, target, 0.5);
    assert.equal(done.remaining, 0);
  });

  it('draws a closed smooth outline through every bin', () => {
    assert.equal(REST_RADII.length, FORM_BINS);
    const cage = radialCage(emptyOffsets(), 200, REST_RADII);
    assert.equal(cage.length, FORM_BINS);
    const smooth = smoothClosed(cage, 4);
    assert.equal(smooth.length, FORM_BINS * 4);
    const first = smooth[0];
    const last = smooth[smooth.length - 1];
    assert.ok(first && last);
    assert.ok(Math.hypot(first.x - last.x, first.y - last.y) > 1);
    let far = 0;
    for (const point of smooth) {
      const radius = Math.hypot(point.x, point.y);
      if (radius > far) far = radius;
    }
    assert.ok(far < 200);
    assert.ok(far > 40);
  });
});
