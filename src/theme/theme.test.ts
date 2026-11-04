import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEFAULT_THEME_PREFERENCE,
  monoHeroFontLineHeight,
  resolveThemeName,
  screenPadding,
  space,
  text,
  themes,
} from './theme.ts';

/** Relative luminance contrast, WCAG 2.x. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const h = hex.replace('#', '');
    const channel = (pair: string) => {
      const value = parseInt(pair, 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    };
    const r = channel(h.slice(0, 2));
    const g = channel(h.slice(2, 4));
    const b = channel(h.slice(4, 6));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const hi = Math.max(lum(a), lum(b));
  const lo = Math.min(lum(a), lum(b));
  return (hi + 0.05) / (lo + 0.05);
}

describe('theme tokens', () => {
  it('maps destructive text to red 700 in light and red 200 in dark', () => {
    assert.equal(themes.light.color.text.destructive, '#9F2D2D');
    assert.equal(themes.dark.color.text.destructive, '#FFB4AB');
  });

  it('uses a 24pt screen margin and Automatisk as the default theme', () => {
    assert.equal(space['4'], 16);
    assert.equal(space['6'], 24);
    assert.equal(space['7'], 28);
    assert.equal(space['10'], 40);
    assert.equal(space['12'], 48);
    assert.equal(space['32'], 128);
    assert.equal(screenPadding, space['6']);
    assert.equal(text.headline.lineHeight, 32);
    assert.equal(text.monoHero.fontSize, 56);
    assert.equal(text.monoHero.lineHeight, 56);
    assert.equal(monoHeroFontLineHeight, 73);
    assert.ok(monoHeroFontLineHeight > Number(text.monoHero.lineHeight));
    assert.equal(DEFAULT_THEME_PREFERENCE, 'system');
    assert.equal(resolveThemeName('system', 'dark'), 'dark');
    assert.equal(resolveThemeName('system', 'light'), 'light');
    assert.equal(resolveThemeName('system', null), 'light');
  });

  it('gives Deg a sand link that stays above 4.5:1 in the light', () => {
    assert.equal(themes.light.color.text.link, '#7D6650');
    assert.equal(themes.dark.color.text.link, '#C4B09A');
    assert.ok(contrast(themes.light.color.text.link, themes.light.color.bg.grouped) >= 4.5);
    assert.ok(contrast(themes.light.color.text.link, themes.light.color.bg.default) >= 4.5);
    assert.ok(contrast(themes.dark.color.text.link, themes.dark.color.bg.grouped) >= 4.5);
  });

  it('puts a 1pt border on the off switch so the control clears 3:1', () => {
    assert.ok(contrast(themes.dark.color.control.off, themes.dark.color.surface.grouped) < 3);
    assert.ok(contrast(themes.light.color.control.off, themes.light.color.surface.grouped) < 3);
    assert.ok(contrast(themes.dark.color.control.offBorder, themes.dark.color.surface.grouped) >= 3);
    assert.ok(contrast(themes.light.color.control.offBorder, themes.light.color.surface.grouped) >= 3);
    assert.ok(contrast(themes.light.color.control.offBorder, themes.light.color.bg.default) >= 3);
    assert.equal(themes.light.color.bg.overlay, 'rgba(17,17,16,0.4)');
    assert.equal(themes.dark.color.bg.overlay, 'rgba(17,17,16,0.4)');
  });
});
