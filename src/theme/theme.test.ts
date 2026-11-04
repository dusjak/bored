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
    assert.equal(themes.light.color.glow.core, '#F6EBD6');
    assert.equal(themes.light.color.glow.halo, '#E8C98E');
    assert.equal(themes.light.color.glow.matte, '#D8CCB6');
    assert.equal(themes.dark.color.glow.core, themes.light.color.glow.core);
    assert.equal(themes.dark.color.glow.halo, themes.light.color.glow.halo);
    assert.equal(DEFAULT_THEME_PREFERENCE, 'system');
    assert.equal(resolveThemeName('system', 'dark'), 'dark');
    assert.equal(resolveThemeName('system', 'light'), 'light');
    assert.equal(resolveThemeName('system', null), 'light');
  });
});
