import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { practiceHintGap } from './practiceLayout.ts';

describe('practice hint', () => {
  it('moves the hint further down as the lump and ring grow', () => {
    const small = practiceHintGap(5);
    const mid = practiceHintGap(10);
    const large = practiceHintGap(20);
    assert.ok(large > mid);
    assert.ok(mid >= small);
    assert.ok(large >= 28);
  });
});