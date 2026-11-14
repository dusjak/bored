import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { screenPadding, text } from '../theme/theme.ts';
import { PRESET_MINUTES } from '../data/copy.ts';
import { stoneCenterY, STONE_CENTER_ON_852 } from '../duration/klumpen.ts';
import { screenTopInset } from '../theme/layout.ts';
import {
  COMPLETION_TITLE_MAX_LINES,
  SESSION_HINT_BOX,
  SESSION_LAYOUT_SCREENS,
  SESSION_RING_GAP,
  SESSION_TIMER_BOX,
  completionTitleBottom,
  completionTitleClearsStone,
  completionTitleTop,
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
        assert.ok(
          reach.width + screenPadding * 2 <= screen.width,
          `${minutes} ring ${reach.width} wider than the content on ${screen.width}`,
        );
      }
    }
  });

  it('fits the canvas, and the margins land on the ring rather than the canvas edge', () => {
    const canvas = sessionCanvasBox();
    for (const screen of SESSION_LAYOUT_SCREENS) {
      assert.ok(canvas.width <= screen.width, `canvas ${canvas.width} wider than ${screen.width}`);
      assert.ok(canvas.height < screen.height);
    }
    for (const minutes of PRESET_MINUTES) {
      const reach = sessionRingReach(minutes);
      const margins = sessionKlumpenMargins(minutes, canvas.cy, SESSION_RING_GAP);
      assert.ok(Math.abs(margins.marginTop + (canvas.cy - reach.top) - SESSION_RING_GAP) < 1e-9);
      assert.ok(Math.abs(margins.hintMarginTop + (canvas.cy - reach.bottom) - SESSION_RING_GAP) < 1e-9);
      assert.ok(reach.top < canvas.cy && reach.bottom < canvas.cy);
    }
  });

  it('puts the completion title above the stone and leaves the stone on 435', () => {
    assert.equal(STONE_CENTER_ON_852, 435);
    assert.equal(stoneCenterY(852), 435);
    assert.equal(completionTitleTop(59), 59 + screenTopInset);
    assert.equal(completionTitleTop(20), 20 + screenTopInset);
    assert.equal(COMPLETION_TITLE_MAX_LINES, 3);
    assert.equal(text.headline.lineHeight, 32);
    assert.equal(completionTitleBottom(0, 1) - completionTitleTop(0), text.headline.lineHeight);
    const phones = [
      { name: 'iPhone SE', width: 375, height: 667, safeTop: 20, safeBottom: 0 },
      { name: 'iPhone 15 Pro', width: 393, height: 852, safeTop: 59, safeBottom: 34 },
    ] as const;
    for (const screen of [...SESSION_LAYOUT_SCREENS, ...phones]) {
      for (const minutes of PRESET_MINUTES) {
        assert.equal(
          completionTitleClearsStone(minutes, screen),
          true,
          `${minutes} min title overlaps the stone on ${'name' in screen ? screen.name : screen.height}`,
        );
        const stoneTop = stoneCenterY(screen.height) - sessionRingReach(minutes).top;
        assert.ok(completionTitleBottom(screen.safeTop) <= stoneTop);
      }
    }
    const source = readFileSync(join(process.cwd(), 'src/app/session.tsx'), 'utf8');
    assert.equal(source.includes('Økt fullført'), false);
    assert.match(source, /top: screenTopInset/);
    assert.match(source, /contentFrame/);
    assert.match(source, /contentColumnForWidth\(windowWidth\)/);
    assert.match(source, /alignItems: 'stretch'/);
    assert.match(source, /<ScreenTitle align="left" variant="headline">/);
    assert.match(source, /stoneCenterY\(windowHeight\) - insets\.top - sessionRingReach/);
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
