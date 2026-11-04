import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { sideButtonCenterForModel, sideButtonCenterPt, SIDE_BUTTON_MEASURES } from './sideButton.ts';

describe('side button table', () => {
  it('converts each measured drawing into the stored point', () => {
    const expected: Record<string, number> = {
      'iPhone17,3': 314,
      'iPhone17,1': 319,
      'iPhone17,2': 320,
    };
    for (const measure of SIDE_BUTTON_MEASURES) {
      assert.equal(sideButtonCenterPt(measure), expected[measure.modelId]);
      assert.equal(sideButtonCenterForModel(measure.modelId), expected[measure.modelId]);
    }
  });

  it('shows no bulge for an unmeasured phone, an iPad, or the Simulator', () => {
    assert.equal(sideButtonCenterForModel('iPhone18,1'), null);
    assert.equal(sideButtonCenterForModel('iPhone17,4'), null);
    assert.equal(sideButtonCenterForModel('iPad14,1'), null);
    assert.equal(sideButtonCenterForModel('arm64'), null);
    assert.equal(sideButtonCenterForModel('x86_64'), null);
    assert.equal(sideButtonCenterForModel(null), null);
    assert.equal(sideButtonCenterForModel(undefined), null);
  });
});
