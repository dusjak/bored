import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEFAULT_THEME_PREFERENCE,
  monoHeroFontLineHeight,
  resolveThemeName,
  screenHeaderInset,
  screenPadding,
  space,
  text,
  themes,
} from './theme.ts';

describe('theme tokens', () => {
  it('maps destructive text to red 700 in light and red 200 in dark', () => {
    assert.equal(themes.light.color.text.destructive, '#9F2D2D');
    assert.equal(themes.dark.color.text.destructive, '#FFB4AB');
  });

  it('uses a 16pt screen margin and Automatisk as the default theme', () => {
    assert.equal(space['4'], 16);
    assert.equal(space['7'], 28);
    assert.equal(screenPadding, space['4']);
    assert.equal(text.headline.lineHeight, 32);
    assert.equal(space['6'], 24);
    // Removed «Logg» block (32 + 24) on top of the 16pt gutter. Welcome and Deg use the same inset.
    assert.equal(screenHeaderInset, screenPadding + Number(text.headline.lineHeight) + space['6']);
    assert.equal(screenHeaderInset, 72);
    assert.equal(text.monoHero.fontSize, 56);
    assert.equal(text.monoHero.lineHeight, 56);
    assert.equal(monoHeroFontLineHeight, 73);
    assert.ok(monoHeroFontLineHeight > Number(text.monoHero.lineHeight));
    assert.equal(DEFAULT_THEME_PREFERENCE, 'system');
    assert.equal(resolveThemeName('system', 'dark'), 'dark');
    assert.equal(resolveThemeName('system', 'light'), 'light');
    assert.equal(resolveThemeName('system', null), 'light');
  });

  it('shares the BD-1 glow colours in both themes', () => {
    for (const theme of [themes.light, themes.dark]) {
      assert.equal(theme.color.glow.core, '#F6EBD6');
      assert.equal(theme.color.glow.amber, '#E8C98E');
      assert.equal(theme.color.glow.highlight, 'rgba(255,255,255,0.35)');
      assert.equal(theme.color.glow.solid, '#F8F6F2');
      assert.equal(theme.color.session['ring-track'], '#66635D');
    }
  });
});
