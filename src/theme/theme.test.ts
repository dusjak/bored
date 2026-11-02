import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DEFAULT_THEME_PREFERENCE, resolveThemeName, screenPadding, space, themes } from './theme.ts';

describe('theme tokens', () => {
  it('maps destructive text to red 700 in light and red 200 in dark', () => {
    assert.equal(themes.light.color.text.destructive, '#9F2D2D');
    assert.equal(themes.dark.color.text.destructive, '#FFB4AB');
  });

  it('uses a 16pt screen margin and Automatisk as the default theme', () => {
    assert.equal(space['4'], 16);
    assert.equal(space['7'], 28);
    assert.equal(screenPadding, space['4']);
    assert.equal(DEFAULT_THEME_PREFERENCE, 'system');
    assert.equal(resolveThemeName('system', 'dark'), 'dark');
    assert.equal(resolveThemeName('system', 'light'), 'light');
    assert.equal(resolveThemeName('system', null), 'light');
  });
});
