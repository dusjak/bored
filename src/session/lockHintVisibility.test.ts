import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  HOLD_HINT_IDLE,
  applyHoldHintTimeout,
  holdHintGateFor,
  holdHintMomentAt,
  isFullscreenWindow,
  lockHintCanvasBox,
  lockHintFrameVisible,
  lockHintOffer,
  lockHintOfferWhileHolding,
} from './lockHintVisibility.ts';

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

  it('uses one gate for start, cancel, and complete, and ignores a stale cancel timer', () => {
    const offer = lockHintOffer(phone);
    const exitMs = 300;
    const visible = (moment: ReturnType<typeof holdHintMomentAt>) =>
      lockHintFrameVisible({ live: true, offer, moment });

    assert.equal(visible(holdHintMomentAt(HOLD_HINT_IDLE, 0)), true);

    const started = holdHintGateFor('start', 1000, exitMs);
    assert.equal(visible(holdHintMomentAt(started, 1000)), false);
    assert.equal(visible(holdHintMomentAt(started, 5000)), false);

    const cancelled = holdHintGateFor('cancel', 2000, exitMs);
    assert.equal(cancelled.reopenAt, 2300);
    assert.equal(holdHintMomentAt(cancelled, 2299), 'cancel');
    assert.equal(visible(holdHintMomentAt(cancelled, 2299)), false);
    assert.equal(holdHintMomentAt(cancelled, 2300), 'idle');
    assert.equal(visible(holdHintMomentAt(cancelled, 2300)), true);
    assert.equal(applyHoldHintTimeout(cancelled, 2300, 2300).moment, 'idle');

    const restarted = holdHintGateFor('start', 2100, exitMs);
    assert.equal(applyHoldHintTimeout(restarted, cancelled.reopenAt ?? 0, 2300), restarted);
    assert.equal(visible(holdHintMomentAt(restarted, 2300)), false);

    const completed = holdHintGateFor('complete', 4000, exitMs);
    assert.equal(applyHoldHintTimeout(completed, cancelled.reopenAt ?? 0, 5000).moment, 'complete');
    assert.equal(visible(holdHintMomentAt(completed, 5000)), false);
    assert.equal(lockHintFrameVisible({ live: false, offer, moment: 'idle' }), false);
  });

  it('session and LockHint paint from that same gate', () => {
    const session = readFileSync(join(process.cwd(), 'src/app/session.tsx'), 'utf8');
    const hint = readFileSync(join(process.cwd(), 'src/components/LockHint.tsx'), 'utf8');
    assert.match(session, /holdHintGateFor\('start'/);
    assert.match(session, /holdHintGateFor\('cancel'/);
    assert.match(session, /holdHintGateFor\('complete'/);
    assert.match(session, /applyHoldHintTimeout/);
    assert.match(session, /holdMoment=\{holdMoment\}/);
    assert.match(hint, /lockHintFrameVisible\(\{ live, offer, moment: holdMoment \}\)/);
  });

  it('overscans the scrim past both edges and keeps the bulge on the bezel', () => {
    const box = lockHintCanvasBox(393, 852);
    assert.equal(box.left, -80);
    assert.equal(box.top, 0);
    assert.equal(box.height, 852);
    assert.equal(box.bezelX - 80, 393);
    assert.equal(box.width - box.bezelX, 24);
    assert.equal(box.gradientStartX, 80);
    assert.ok(80 > 50, 'left bleed covers the 50pt strip on the session screenshot');
    const narrow = lockHintCanvasBox(0, 0);
    assert.equal(narrow.width, 80 + 24);
    assert.equal(narrow.bezelX, 80);
    const hint = readFileSync(join(process.cwd(), 'src/components/LockHint.tsx'), 'utf8');
    assert.match(hint, /lockHintCanvasBox\(box\.width, box\.height\)/);
    assert.match(hint, /left: canvas\.left/);
    assert.match(hint, /cx=\{canvas\.bezelX\}/);
  });

  it('treats a window that matches the screen as full screen', () => {
    assert.equal(isFullscreenWindow(402, 874, 402, 874), true);
    assert.equal(isFullscreenWindow(390, 844, 402, 874), false);
    assert.equal(isFullscreenWindow(390, 860, 402, 874), true);
  });
});
