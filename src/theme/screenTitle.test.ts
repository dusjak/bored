import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ITALIC_BLEED,
  screenTitleBox,
  titleEdgeRoom,
  titleLineWidth,
  titleOrigin,
} from './screenTitle.ts';
import { screenPadding } from './theme.ts';

/** iPhone SE content column: 320 minus the 24pt margin on each side. */
const NARROW = 320 - screenPadding * 2;

describe('screen titles', () => {
  it('keeps a left-aligned title on the 24pt margin and inside the screen', () => {
    const box = screenTitleBox('left');
    assert.equal(titleOrigin(box), 0);
    assert.equal(box.numberOfLines, null);
    assert.ok(ITALIC_BLEED <= screenPadding);
    assert.ok(titleEdgeRoom(box) >= 0);
    assert.equal(titleLineWidth(NARROW, box), NARROW);
  });

  it('wraps a long name instead of clipping it to the margin', () => {
    const box = screenTitleBox('left');
    const name = 'Kristoffer Alexander Johannessen';
    assert.equal(box.numberOfLines, null);
    assert.ok(name.length > 1);
    assert.equal(titleLineWidth(NARROW, box), NARROW);
    assert.ok(titleLineWidth(402 - screenPadding * 2, box) > NARROW);
  });

  it('gives a centred title the same bleed without shifting its block', () => {
    const box = screenTitleBox('center');
    assert.equal(box.marginLeft, 0);
    assert.equal(box.marginRight, 0);
    assert.equal(box.textAlign, 'center');
    assert.equal(box.numberOfLines, null);
    assert.equal(titleLineWidth(NARROW, box), NARROW - ITALIC_BLEED * 2);
    assert.ok(titleEdgeRoom(box) >= screenPadding);
  });
});
