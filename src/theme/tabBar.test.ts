import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { text, themes } from './theme.ts';
import {
  DEG_HEAD,
  KLUMPEN_ICON,
  LOG_BARS,
  TAB_BAR,
  degHeadRadius,
  klumpenIconStrokePt,
  outerRect,
  tabSlotWidth,
} from './tabBar.ts';

describe('tab bar v6', () => {
  it('is a 345×64 capsule with Figtree 10pt labels', () => {
    assert.equal(TAB_BAR.width, 345);
    assert.equal(TAB_BAR.height, 64);
    assert.equal(TAB_BAR.radius, 32);
    assert.equal(TAB_BAR.labelSize, 10);
    assert.equal(text.tab.fontSize, 10);
    assert.equal(text.tab.fontFamily, 'Figtree_500Medium');
    assert.equal(text.body.fontFamily, 'DMSans_400Regular');
    assert.equal(text.label.fontFamily, 'DMSans_500Medium');
  });

  it('uses text.primary and text.tertiary in light mode', () => {
    assert.equal(themes.light.color.text.primary, TAB_BAR.activeInk);
    assert.equal(themes.light.color.text.tertiary, TAB_BAR.inactiveInk);
    assert.equal(TAB_BAR.activePill, '#F4F3F2');
  });

  it('gives each slot 110pt and keeps the Klumpen stroke at 1.4pt', () => {
    assert.equal(tabSlotWidth(), 110);
    assert.equal(TAB_BAR.insetX + 110 + TAB_BAR.slotGap + 110 + TAB_BAR.slotGap + 110 + TAB_BAR.insetX, 345);
    assert.ok(Math.abs(klumpenIconStrokePt() - 1.4) < 0.01);
    assert.equal(KLUMPEN_ICON.size, 24);
  });

  it('draws filled Logg bars on the outline’s outer edge', () => {
    const filled = LOG_BARS.map((bar) => outerRect(bar));
    assert.deepEqual(filled, [
      { x: 0.9, y: 13, width: 5.2, height: 7, rx: 1.2 },
      { x: 9.4, y: 7, width: 5.2, height: 13, rx: 1.2 },
      { x: 17.9, y: 10, width: 5.2, height: 10, rx: 1.2 },
    ]);
  });

  it('grows the Deg head by half the stroke when it is filled', () => {
    assert.equal(degHeadRadius(false), DEG_HEAD.r);
    assert.equal(degHeadRadius(true), 3.6);
  });
});
