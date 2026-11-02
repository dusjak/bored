import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { EMPTY_NUDGE, nudgeAfterDismiss, shouldShowBackupNudge, type NudgeFlags } from './nudge.ts';

function flags(patch: Partial<NudgeFlags> = {}): NudgeFlags {
  return { ...EMPTY_NUDGE, ...patch };
}

describe('backup nudge show rule', () => {
  it('stays hidden before 3 completed sessions', () => {
    assert.equal(shouldShowBackupNudge(flags(), 0), false);
    assert.equal(shouldShowBackupNudge(flags(), 2), false);
  });

  it('shows at the first threshold of 3 when it has never been dismissed', () => {
    assert.equal(shouldShowBackupNudge(flags(), 3), true);
    assert.equal(shouldShowBackupNudge(flags(), 9), true);
  });

  it('hides after the first dismiss until 10 completed sessions and a gap of 3', () => {
    const once = flags({ dismissCount: 1, dismissedAtSessions: 3 });
    assert.equal(shouldShowBackupNudge(once, 9), false);
    assert.equal(shouldShowBackupNudge(once, 10), true);
    const late = flags({ dismissCount: 1, dismissedAtSessions: 9 });
    assert.equal(shouldShowBackupNudge(late, 10), false);
    assert.equal(shouldShowBackupNudge(late, 11), false);
    assert.equal(shouldShowBackupNudge(late, 12), true);
  });

  it('treats a missing dismissed-at count as 0', () => {
    const once = flags({ dismissCount: 1, dismissedAtSessions: null });
    assert.equal(shouldShowBackupNudge(once, 10), true);
  });

  it('never shows after the second dismiss', () => {
    const twice = nudgeAfterDismiss(
      nudgeAfterDismiss(flags(), 3, '2026-11-01T12:00:00.000Z'),
      12,
      '2026-11-01T13:00:00.000Z',
    );
    assert.equal(twice.dismissCount, 2);
    assert.equal(twice.dismissedAtSessions, 12);
    assert.equal(shouldShowBackupNudge(twice, 12), false);
    assert.equal(shouldShowBackupNudge(twice, 40), false);
  });

  it('never shows once backup has been enabled, even with no dismissals', () => {
    assert.equal(shouldShowBackupNudge(flags({ everEnabled: true }), 3), false);
    assert.equal(shouldShowBackupNudge(flags({ everEnabled: true }), 20), false);
  });

  it('stores the session count and a debug timestamp on dismiss without enabling backup', () => {
    const next = nudgeAfterDismiss(flags(), 4, '2026-11-01T12:00:00.000Z');
    assert.deepEqual(next, {
      dismissCount: 1,
      dismissedAtSessions: 4,
      dismissedAt: '2026-11-01T12:00:00.000Z',
      everEnabled: false,
    });
    assert.equal(shouldShowBackupNudge(next, 4), false);
  });
});
