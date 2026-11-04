import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  deg,
  indexFromOffset,
  switchInset,
  switchKnob,
  switchTrack,
  switchTravel,
  WHEEL_HOURS,
  WHEEL_MINUTES,
  wheelIndex,
} from './deg.ts';

describe('Deg v2.2', () => {
  it('keeps the original switch proportions', () => {
    assert.equal(switchTrack.width, 52);
    assert.equal(switchTrack.height, 31);
    assert.equal(switchKnob, 27);
    assert.equal(switchInset, 2);
    assert.equal(switchTravel, 21);
  });

  it('spaces the title, cards, and footer on the 9:41 frame', () => {
    assert.equal(deg.groupRadius, 14);
    assert.equal(deg.groupGap, 32);
    assert.equal(deg.rowMinHeight, 50);
    assert.equal(deg.rowInset, 16);
    assert.equal(deg.separator, 0.5);
    assert.equal(deg.footerGap, 7);
    // Two caption lines, then the same 32 pt that separates cards with no footer.
    assert.equal(deg.footerGap + 18 + 18 + deg.groupGap, 75);
    assert.equal(deg.titleSize, 44);
    assert.equal(deg.titleLine, 60);
    assert.equal(deg.titleTop, 34);
    assert.equal(deg.afterTitle, 24);
    assert.equal(deg.resetGap, 30);
    assert.equal(deg.versionGap, 28);
    assert.equal(deg.fadeHeight, 150);
    assert.equal(deg.rowSize, 17);
  });

  it('snaps the inline wheel to hours and 5-minute steps', () => {
    assert.equal(deg.wheelHeight, 216);
    assert.equal(deg.wheelRow, 34);
    assert.equal(deg.wheelMinuteStep, 5);
    assert.equal(WHEEL_HOURS.length, 24);
    assert.equal(WHEEL_HOURS[0], '00');
    assert.equal(WHEEL_HOURS[23], '23');
    assert.deepEqual(WHEEL_MINUTES, ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']);
    assert.equal(wheelIndex(WHEEL_MINUTES, '30'), 6);
    assert.equal(wheelIndex(WHEEL_MINUTES, '01'), 0);
    assert.equal(indexFromOffset(34 * 6, WHEEL_MINUTES.length), 6);
    assert.equal(indexFromOffset(34 * 6 + 20, WHEEL_MINUTES.length), 7);
    assert.equal(indexFromOffset(-10, WHEEL_MINUTES.length), 0);
    assert.equal(indexFromOffset(9999, WHEEL_MINUTES.length), WHEEL_MINUTES.length - 1);
  });
});