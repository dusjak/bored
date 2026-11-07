import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isFullscreenWindow, lockHintOffer, lockHintOfferWhileHolding } from './lockHintVisibility.ts';

const phone = { fresh: true, phone: true, portrait: true, fullscreen: true, centerY: 319 };

describe('lock hint offer', () => {
  it('shows the bulge on a fresh portrait phone whose button is measured', () => {
    assert.equal(lockHintOffer(phone), 'bulge');
  });

  it('shows only the text when the model is not in the table', () => {
    assert.equal(lockHintOffer({ ...phone, centerY: null }), 'text');
  });

  it('stays hidden off a fresh full-screen portrait phone', () => {
    assert.equal(lockHintOffer({ ...phone, fresh: false }), 'hidden');
    assert.equal(lockHintOffer({ ...phone, phone: false }), 'hidden');
    assert.equal(lockHintOffer({ ...phone, portrait: false }), 'hidden');
    assert.equal(lockHintOffer({ ...phone, fullscreen: false }), 'hidden');
  });

  it('hides the lock hint for the whole hold-to-end gesture', () => {
    assert.equal(lockHintOfferWhileHolding('bulge', 'idle'), 'bulge');
    assert.equal(lockHintOfferWhileHolding('text', 'idle'), 'text');
    assert.equal(lockHintOfferWhileHolding('bulge', 'start'), 'hidden');
    assert.equal(lockHintOfferWhileHolding('text', 'cancel'), 'hidden');
    assert.equal(lockHintOfferWhileHolding('bulge', 'complete'), 'hidden');
  });

  it('treats a window that matches the screen as full screen', () => {
    assert.equal(isFullscreenWindow(402, 874, 402, 874), true);
    assert.equal(isFullscreenWindow(390, 844, 402, 874), false);
    assert.equal(isFullscreenWindow(390, 860, 402, 874), true);
  });
});
