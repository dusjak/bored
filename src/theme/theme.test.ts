import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { screenPadding, space, themes } from './theme.ts';

describe('theme tokens', () => {
  it('maps destructive text to red 700 in light and red 200 in dark', () => {
    assert.equal(themes.light.color.text.destructive, '#9F2D2D');
    assert.equal(themes.dark.color.text.destructive, '#FFB4AB');
  });

  it('keeps screen padding on space 7', () => {
    assert.equal(space['7'], 28);
    assert.equal(screenPadding, space['7']);
  });
});
