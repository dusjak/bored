import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  deg,
  indexFromOffset,
  switchInset,
  switchKnob,
  switchTrack,
  switchTravel,
  snapReminderClock,
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
    const group = readFileSync(join(process.cwd(), 'src/components/SettingsGroup.tsx'), 'utf8');
    assert.match(group, /left: deg\.rowInset/);
    assert.match(group, /right: deg\.rowInset/);
    assert.doesNotMatch(group, /right: 0/);
    assert.equal(deg.footerGap, 7);
    // Two caption lines, then the same 32 pt that separates cards with no footer.
    assert.equal(deg.footerGap + 18 + 18 + deg.groupGap, 75);
    assert.equal(deg.titleSize, 44);
    assert.equal(deg.titleLine, 60);
    assert.equal(deg.titleTop, 34);
    assert.equal(deg.afterTitle, 24);
    assert.equal(deg.sinceGap, 8);
    assert.equal(deg.sinceSize, 15);
    assert.equal(deg.sinceLineHeight, 20);
    assert.equal(deg.sinceToGroup, 28);
    assert.equal(deg.titleLine, 60);
    assert.equal(deg.resetGap, 30);
    assert.equal(deg.versionGap, 18);
    assert.equal(deg.rowTextShift, 0);
    assert.equal(deg.fadeHeight, 150);
    assert.equal(deg.rowSize, 17);
  });

  it('snaps the wheel to hours 00–23 and minutes 00, 05, … 55', () => {
    assert.equal(deg.wheelHeight, 216);
    assert.equal(deg.wheelRow, 34);
    assert.equal(deg.wheelMinuteStep, 5);
    assert.equal(WHEEL_HOURS.length, 24);
    assert.equal(WHEEL_HOURS[0], '00');
    assert.equal(WHEEL_HOURS[23], '23');
    assert.deepEqual(WHEEL_MINUTES, ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']);
    assert.equal(wheelIndex(WHEEL_MINUTES, '30'), 6);
    assert.equal(wheelIndex(WHEEL_MINUTES, '05'), 1);
    assert.equal(indexFromOffset(34 * 6, WHEEL_MINUTES.length), 6);
    assert.equal(indexFromOffset(34 * 6 + 20, WHEEL_MINUTES.length), 7);
    assert.equal(indexFromOffset(-10, WHEEL_MINUTES.length), 0);
    assert.equal(indexFromOffset(9999, WHEEL_MINUTES.length), WHEEL_MINUTES.length - 1);
  });

  it('rounds a stored reminder onto the 5-minute grid when the wheel opens', () => {
    assert.deepEqual(snapReminderClock(8, 0), { hour: 8, minute: 0 });
    assert.deepEqual(snapReminderClock(8, 2), { hour: 8, minute: 0 });
    assert.deepEqual(snapReminderClock(8, 3), { hour: 8, minute: 5 });
    assert.deepEqual(snapReminderClock(8, 7), { hour: 8, minute: 5 });
    assert.deepEqual(snapReminderClock(8, 8), { hour: 8, minute: 10 });
    assert.deepEqual(snapReminderClock(12, 30), { hour: 12, minute: 30 });
    assert.deepEqual(snapReminderClock(23, 55), { hour: 23, minute: 55 });
    assert.deepEqual(snapReminderClock(23, 57), { hour: 23, minute: 55 });
    assert.deepEqual(snapReminderClock(23, 58), { hour: 0, minute: 0 });
    assert.deepEqual(snapReminderClock(23, 59), { hour: 0, minute: 0 });
  });
});