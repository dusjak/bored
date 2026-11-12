import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { screenPadding, size, space } from './theme.ts';
import {
  contentColumnCapMinWidth,
  contentColumnCapped,
  contentColumnForWidth,
  contentColumnWidth,
  contentMaxWidth,
  insetUnderSafeArea,
  questionContentInset,
  questionNavHeight,
  screenTopInset,
  welcomeTopInset,
} from './layout.ts';

describe('layout v2.1', () => {
  it('keeps 24pt side margins on phones and the 345pt cap from tablet width', () => {
    assert.equal(screenPadding, space['6']);
    assert.equal(screenPadding, 24);
    assert.equal(contentMaxWidth, 345);
    assert.equal(contentColumnCapMinWidth, 600);
    assert.equal(screenPadding + contentMaxWidth + screenPadding, 393);
    assert.equal(contentColumnCapped(393), false);
    assert.equal(contentColumnCapped(440), false);
    assert.equal(contentColumnCapped(599), false);
    assert.equal(contentColumnCapped(600), true);
    assert.equal(contentColumnWidth(393), 345);
    assert.equal(contentColumnWidth(440), 440 - screenPadding * 2);
    assert.equal(contentColumnWidth(430), 430 - screenPadding * 2);
    assert.equal(contentColumnWidth(320), 320 - screenPadding * 2);
    assert.equal(contentColumnWidth(375), 375 - screenPadding * 2);
    assert.equal(contentColumnWidth(600), 345);
    assert.equal(contentColumnWidth(768), 345);
    assert.equal(contentColumnWidth(1024), 345);
    assert.equal(contentColumnForWidth(440).maxWidth, undefined);
    assert.equal(contentColumnForWidth(768).maxWidth, 345);
  });

  it('takes top insets from the spacing scale, under the safe area', () => {
    assert.equal(screenTopInset, space['10']);
    assert.equal(screenTopInset, 40);
    assert.equal(welcomeTopInset, space['32']);
    assert.equal(welcomeTopInset, 128);
    assert.equal(questionNavHeight, size['hit-min']);
    assert.equal(questionNavHeight, 44);
    assert.equal(questionContentInset, space['6']);
    assert.equal(questionContentInset, 24);
    assert.equal(questionNavHeight + questionContentInset, 68);

    assert.equal(insetUnderSafeArea('app'), screenTopInset);
    assert.equal(insetUnderSafeArea('welcome'), welcomeTopInset);
    assert.equal(insetUnderSafeArea('none'), 0);
    assert.equal(insetUnderSafeArea('gutter'), screenPadding);
  });
});
