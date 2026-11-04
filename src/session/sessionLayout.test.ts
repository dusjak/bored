import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { screenPadding } from '../theme/theme.ts';
import { PRESET_MINUTES } from '../data/copy.ts';
import {
  SESSION_HINT_BOX,
  SESSION_LAYOUT_SCREENS,
  SESSION_RING_GAP,
  SESSION_TIMER_BOX,
  sessionCanvasBox,
  sessionColumn,
  sessionKlumpenMargins,
  sessionRingReach,
} from './sessionLayout.ts';

describe('session column', () => {
  it('keeps one gap above the track stroke and one below it at every duration', () => {
    for (const screen of SESSION_LAYOUT_SCREENS) {
      for (const minutes of PRESET_MINUTES) {
        const column = sessionColumn(minutes, screen, true);
        const above = column.ringTop - column.timerBottom;
        const below = column.hintTop - column.ringBottom;
        assert.ok(Math.abs(above - SESSION_RING_GAP) < 1e-6, `${minutes} min above on ${screen.width}`);
        assert.ok(Math.abs(below - SESSION_RING_GAP) < 1e-6, `${minutes} min below on ${screen.width}`);
        assert.ok(Math.abs(column.timerBottom - column.timerTop - SESSION_TIMER_BOX) < 1e-6);
        assert.ok(Math.abs(column.hintBottom - column.hintTop - SESSION_HINT_BOX) < 1e-6);
        assert.ok(column.ringBottom - column.ringTop > 0);
        assert.ok(column.timerTop >= screen.safeTop, `${minutes} timer top ${column.timerTop}`);
        assert.ok(
          column.hintBottom <= screen.height - screen.safeBottom,
          `${minutes} hint bottom ${column.hintBottom} on ${screen.height}`,
        );
        assert.ok(column.ringTop >= column.timerBottom);
        assert.ok(column.hintTop >= column.ringBottom);
        const reach = sessionRingReach(minutes);
        assert.ok(reach.width + screenPadding * 2 <= screen.width, `${minutes} ring wider than ${screen.width}`);
      }
    }
  });

  it('fits the canvas, and the margins land on the ring rather than the canvas edge', () => {
    const canvas = sessionCanvasBox();
    assert.ok(canvas.width + screenPadding * 2 <= 375);
    assert.ok(canvas.height < 852);
    for (const minutes of PRESET_MINUTES) {
      const reach = sessionRingReach(minutes);
      const margins = sessionKlumpenMargins(minutes, canvas.cy, SESSION_RING_GAP);
      assert.ok(Math.abs(margins.marginTop + (canvas.cy - reach.top) - SESSION_RING_GAP) < 1e-9);
      assert.ok(Math.abs(margins.hintMarginTop + (canvas.cy - reach.bottom) - SESSION_RING_GAP) < 1e-9);
      assert.ok(reach.top < canvas.cy && reach.bottom < canvas.cy);
    }
  });

  it('still clears the ring when the countdown is hidden', () => {
    for (const screen of SESSION_LAYOUT_SCREENS) {
      for (const minutes of PRESET_MINUTES) {
        const column = sessionColumn(minutes, screen, false);
        assert.equal(column.gapAbove, 0);
        assert.equal(column.hintTop - column.ringBottom, SESSION_RING_GAP);
        assert.ok(column.timerTop >= screen.safeTop);
        assert.ok(column.hintBottom <= screen.height - screen.safeBottom);
      }
    }
  });
});
