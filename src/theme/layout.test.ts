import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { screenPadding, size, space } from './theme.ts';
import {
  contentColumnWidth,
  contentMaxWidth,
  insetUnderSafeArea,
  questionContentInset,
  questionNavHeight,
  screenTopInset,
  welcomeTopInset,
} from './layout.ts';

describe('layout v2.1', () => {
  it('keeps a 345pt column inside a 24pt side inset', () => {
    assert.equal(screenPadding, space['6']);
    assert.equal(screenPadding, 24);
    assert.equal(contentMaxWidth, 345);
    assert.equal(screenPadding + contentMaxWidth + screenPadding, 393);
    assert.equal(contentColumnWidth(393), 345);
    assert.equal(contentColumnWidth(440), 345);
    assert.equal(contentColumnWidth(320), 320 - screenPadding * 2);
    assert.equal(contentColumnWidth(375), 375 - screenPadding * 2);
  });

  it('takes top insets from the spacing scale, under the safe area', () => {
    assert.equal(screenTopInset, space['10']);
    assert.equal(screenTopInset, 40);
    assert.equal(welcomeTopInset, space['32']);
    assert.equal(welcomeTopInset, 128);
    assert.equal(questionNavHeight, size['hit-min']);
    assert.equal(questionNavHeight, 44);
    assert.equal(questionContentInset, space['12']);
    assert.equal(questionContentInset, 48);
    assert.equal(questionNavHeight + questionContentInset, 92);

    assert.equal(insetUnderSafeArea('app'), screenTopInset);
    assert.equal(insetUnderSafeArea('welcome'), welcomeTopInset);
    assert.equal(insetUnderSafeArea('none'), 0);
    assert.equal(insetUnderSafeArea('gutter'), screenPadding);
  });
});
