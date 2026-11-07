import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { KLUMPEN_PATH } from '../components/klumpenPath.ts';
import {
  KLUMP,
  LOG_COUNT_WORD_GAP,
  LOG_DELETE_FLEX,
  LOG_KLUMP_SPACING,
  LOG_NOTE_ACTION_GAP,
  LOG_SAVE_FLEX,
  groupKlumper,
  klumpRowWidth,
  klumpenFrame,
} from './klumper.ts';

describe('log lumps', () => {
  it('groups sessions five by five and keeps order', () => {
    const marks = Array.from({ length: 14 }, (_, index) => index);
    const groups = groupKlumper(marks);
    assert.deepEqual(
      groups.map((group) => group.length),
      [5, 5, 4],
    );
    assert.deepEqual(groups.flat(), marks);
    assert.deepEqual(groupKlumper([]), []);
    assert.equal(groupKlumper([1, 2, 3, 4, 5]).length, 1);
  });

  it('matches the comp’s 300pt row for fourteen lumps', () => {
    assert.equal(klumpRowWidth(0), 0);
    assert.equal(klumpRowWidth(1), 16);
    assert.equal(klumpRowWidth(5), 5 * 16 + 4 * 4);
    assert.equal(klumpRowWidth(14), 300);
    assert.equal(KLUMP.gap, 4);
    assert.equal(KLUMP.groupGap, 16);
    assert.equal(LOG_KLUMP_SPACING.aboveCount, 9);
    assert.equal(LOG_KLUMP_SPACING.aboveSummary, 13);
    assert.equal(LOG_COUNT_WORD_GAP, 8);
    assert.equal(LOG_NOTE_ACTION_GAP, 8);
    assert.equal(LOG_SAVE_FLEX / (LOG_SAVE_FLEX + LOG_DELETE_FLEX), 2 / 3);
    assert.equal(LOG_DELETE_FLEX / (LOG_SAVE_FLEX + LOG_DELETE_FLEX), 1 / 3);
  });

  it('keeps a 1.4pt stroke when the lump is 16pt wide', () => {
    const frame = klumpenFrame(KLUMP.width, KLUMP.stroke);
    const viewWidth = Number(frame.viewBox.split(' ')[2]);
    const strokePt = frame.strokeWidth * (frame.width / viewWidth);
    assert.ok(Math.abs(strokePt - 1.4) < 0.001);
    assert.ok(frame.height > 13 && frame.height < 14);
    assert.ok(KLUMPEN_PATH.startsWith('M 996.76'));
    assert.equal(KLUMP.ink, '#000000');
  });
});
