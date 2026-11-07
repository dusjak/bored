import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { KLUMPEN_PATH } from '../components/klumpenPath.ts';
import {
  KLUMP,
  KLUMP_GROUP,
  LOG_DELETE_FLEX,
  LOG_KLUMP_SPACING,
  LOG_NOTE_ACTION_GAP,
  LOG_SAVE_FLEX,
  LOGG_COLLAPSED_MAX,
  LOGG_PER_ROW,
  LOGG_TOGGLE,
  groupKlumper,
  klumpenFrame,
  logCaption,
  logMetrics,
  logRowWidth,
  logSymbolRows,
  visibleTallyCount,
} from './klumper.ts';

describe('logg v4 tally', () => {
  it('fits fifteen symbols in three groups across 345pt', () => {
    const metrics = logMetrics(345);
    assert.equal(metrics.width, 17.25);
    assert.equal(metrics.stroke, 1.4);
    assert.equal(metrics.gap, 4.3125);
    assert.equal(metrics.groupGap, 17.25);
    assert.equal(metrics.rowGap, 8.625);
    assert.equal(logRowWidth(metrics), 345);
    assert.equal(KLUMP_GROUP, 5);
    assert.equal(LOGG_PER_ROW, 15);
    assert.equal(LOGG_COLLAPSED_MAX, 30);
  });

  it('scales gaps with a narrow column and keeps the 1.4pt stroke', () => {
    const half = logMetrics(172.5);
    assert.equal(half.width, 8.625);
    assert.equal(half.gap, 2.15625);
    assert.equal(half.groupGap, 8.625);
    assert.equal(half.rowGap, 4.3125);
    assert.equal(half.stroke, 1.4);
    assert.equal(logRowWidth(half), 172.5);
    assert.equal(logMetrics(400).width, KLUMP.width);
  });

  it('keeps a 1.4pt stroke on the 17.25pt lump', () => {
    const frame = klumpenFrame(KLUMP.width, KLUMP.stroke);
    const viewWidth = Number(frame.viewBox.split(' ')[2]);
    const strokePt = frame.strokeWidth * (frame.width / viewWidth);
    assert.ok(Math.abs(strokePt - 1.4) < 0.001);
    assert.ok(Math.abs(frame.height - 14.80167) < 0.02);
    assert.ok(KLUMPEN_PATH.startsWith('M 996.76'));
  });

  it('packs newest-first marks into rows of three groups', () => {
    const marks = Array.from({ length: 16 }, (_, index) => index);
    const rows = logSymbolRows(marks);
    assert.equal(rows.length, 2);
    assert.deepEqual(
      rows[0].map((group) => group.length),
      [5, 5, 5],
    );
    assert.deepEqual(
      rows[1].map((group) => group.length),
      [1],
    );
    assert.deepEqual(rows.flat(2), marks);
    assert.equal(logSymbolRows(Array.from({ length: 15 }, (_, index) => index)).length, 1);
    assert.equal(logSymbolRows(Array.from({ length: 7 }, (_, index) => index))[0].length, 2);
    assert.deepEqual(groupKlumper([]), []);
  });

  it('shows every symbol through 30 and collapses the rest until opened', () => {
    for (const count of [0, 1, 7, 15, 16, 30]) {
      assert.equal(visibleTallyCount(count, false), count);
      assert.equal(visibleTallyCount(count, true), count);
    }
    assert.equal(visibleTallyCount(31, false), 30);
    assert.equal(visibleTallyCount(31, true), 31);
    assert.equal(visibleTallyCount(47, false), 30);
    assert.equal(visibleTallyCount(47, true), 47);
    assert.equal(Math.ceil(visibleTallyCount(47, true) / LOGG_PER_ROW), 4);
  });

  it('counts every session in the caption, including a zero aborted count', () => {
    assert.equal(logCaption(1, 0, 1), '1 økt: 0 fullført, 1 avbrutt');
    assert.equal(logCaption(7, 5, 2), '7 økter: 5 fullført, 2 avbrutt');
    assert.equal(logCaption(15, 15, 0), '15 økter: 15 fullført, 0 avbrutt');
    assert.equal(logCaption(47, 33, 14), '47 økter: 33 fullført, 14 avbrutt');
  });

  it('keeps the accordion hit target and the note-action split', () => {
    assert.equal(LOGG_TOGGLE.minHeight, 44);
    assert.equal(LOGG_TOGGLE.more, 'Vis alle');
    assert.equal(LOGG_TOGGLE.less, 'Vis færre');
    assert.equal(LOG_KLUMP_SPACING.aboveSummary, 13);
    assert.equal(LOG_KLUMP_SPACING.aboveToggle, 8);
    assert.equal(LOG_KLUMP_SPACING.belowToggle, 5);
    assert.equal(LOG_NOTE_ACTION_GAP, 8);
    assert.equal(LOG_SAVE_FLEX / (LOG_SAVE_FLEX + LOG_DELETE_FLEX), 2 / 3);
    assert.equal(LOG_DELETE_FLEX / (LOG_SAVE_FLEX + LOG_DELETE_FLEX), 1 / 3);
  });

  it('removes the large count and keeps one summary on the log screen', () => {
    const source = readFileSync(join(process.cwd(), 'src/app/(tabs)/log/index.tsx'), 'utf8');
    assert.match(source, /Ingen økter ennå\./);
    assert.match(source, /logCaption/);
    assert.match(source, /accessibilityState=\{\{ expanded: tallyOpen \}\}/);
    assert.doesNotMatch(source, /monoHero/);
    assert.doesNotMatch(source, /y:\s*175|y=\{175\}/);
    const symbols = readFileSync(join(process.cwd(), 'src/components/SessionKlumps.tsx'), 'utf8');
    assert.match(symbols, /accessibilityElementsHidden/);
    assert.match(symbols, /KLUMPEN_PATH/);
    assert.match(symbols, /strokeLinejoin="round"/);
  });
});
