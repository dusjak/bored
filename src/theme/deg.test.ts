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
    assert.equal(deg.versionGap, 18);
    assert.equal(deg.rowTextShift, 2);
    assert.equal(deg.fadeHeight, 150);
    assert.equal(deg.rowSize, 17);
  });

  it('snaps the wheel to hours 00–23 and minutes 00–59', () => {
    assert.equal(deg.wheelHeight, 216);
    assert.equal(deg.wheelRow, 34);
    assert.equal(deg.wheelMinuteStep, 1);
    assert.equal(WHEEL_HOURS.length, 24);
    assert.equal(WHEEL_HOURS[0], '00');
    assert.equal(WHEEL_HOURS[23], '23');
    assert.equal(WHEEL_MINUTES.length, 60);
    assert.equal(WHEEL_MINUTES[0], '00');
    assert.equal(WHEEL_MINUTES[1], '01');
    assert.equal(WHEEL_MINUTES[59], '59');
    assert.equal(wheelIndex(WHEEL_MINUTES, '30'), 30);
    assert.equal(wheelIndex(WHEEL_MINUTES, '01'), 1);
    assert.equal(indexFromOffset(34 * 30, WHEEL_MINUTES.length), 30);
    assert.equal(indexFromOffset(34 * 30 + 20, WHEEL_MINUTES.length), 31);
    assert.equal(indexFromOffset(-10, WHEEL_MINUTES.length), 0);
    assert.equal(indexFromOffset(9999, WHEEL_MINUTES.length), WHEEL_MINUTES.length - 1);
  });
});