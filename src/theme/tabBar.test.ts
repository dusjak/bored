import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { text, themes } from './theme.ts';
import {
  DEG_HEAD,
  KLUMPEN_ICON,
  LOG_BARS,
  TAB_BAR,
  TAB_BAR_DARK,
  degHeadRadius,
  nativeTabInk,
  tabBarDarkGlass,
  tabBarKind,
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
    assert.equal(text.body.fontFamily, 'Figtree_400Regular');
    assert.equal(text.label.fontFamily, 'Figtree_500Medium');
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

  it('keeps one iOS navigator and tints dark without the custom glass', () => {
    assert.equal(TAB_BAR.activeInk, '#111110');
    assert.equal(TAB_BAR.inactiveInk, '#66635D');
    assert.equal(tabBarKind('ios'), 'native');
    assert.equal(tabBarKind('android'), 'v6');
    assert.deepEqual(nativeTabInk('light'), { active: '#111110', inactive: '#66635D' });
    assert.deepEqual(nativeTabInk('dark'), { active: '#F8F6F2', inactive: '#8C887F' });
    assert.equal(TAB_BAR_DARK.activePill, '#34322E');
    assert.equal(tabBarDarkGlass(), 'rgba(44,43,40,0.72)');
    const layout = readFileSync(join(process.cwd(), 'src/app/(tabs)/_layout.tsx'), 'utf8');
    assert.match(layout, /tabBarKind\(Platform\.OS\)/);
    assert.doesNotMatch(layout, /tabBarKind\(Platform\.OS, theme/);
    assert.match(layout, /tabs\/hjem\.png/);
    assert.match(layout, /tabs\/hjem-fill\.png/);
    assert.match(layout, /tabs\/logg\.png/);
    assert.match(layout, /tabs\/logg-fill\.png/);
    assert.match(layout, /tabs\/deg\.png/);
    assert.match(layout, /tabs\/deg-fill\.png/);
    assert.doesNotMatch(layout, /sf:|SFSymbol/);
  });

  it('grows the Deg head by half the stroke when it is filled', () => {
    assert.equal(degHeadRadius(false), DEG_HEAD.r);
    assert.equal(degHeadRadius(true), 3.6);
  });
});
