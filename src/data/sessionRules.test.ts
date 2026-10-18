import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { decideUnfinishedSession, elapsedSeconds } from './sessionRules.ts';

const started = Date.parse('2026-10-18T12:00:00.000Z');
const chosen = 600;

describe('decideUnfinishedSession', () => {
  it('resumes when time is left, whether or not the process died', () => {
    const now = started + 120_000;
    for (const returnKind of ['foreground-return', 'cold-start'] as const) {
      const decision = decideUnfinishedSession({
        nowMs: now,
        startedAtMs: started,
        chosenDurationSeconds: chosen,
        backgroundedAtMs: now - 5_000,
        returnKind,
      });
      assert.equal(decision.kind, 'resume');
      if (decision.kind === 'resume') assert.equal(decision.remainingSeconds, 480);
    }
  });

  it('completes a lock or an app switch when the process is still alive', () => {
    const decision = decideUnfinishedSession({
      nowMs: started + 900_000,
      startedAtMs: started,
      chosenDurationSeconds: chosen,
      backgroundedAtMs: started + 30_000,
      returnKind: 'foreground-return',
    });
    assert.deepEqual(decision, {
      kind: 'completed',
      actualDurationSeconds: 600,
      endedAtMs: started + 600_000,
    });
  });

  it('aborts a killed session at the last background time', () => {
    const backgrounded = started + 125_000;
    const decision = decideUnfinishedSession({
      nowMs: started + 900_000,
      startedAtMs: started,
      chosenDurationSeconds: chosen,
      backgroundedAtMs: backgrounded,
      returnKind: 'cold-start',
    });
    assert.deepEqual(decision, {
      kind: 'aborted',
      actualDurationSeconds: 125,
      endedAtMs: backgrounded,
    });
  });

  it('caps a killed session at the chosen duration when no background time was stored', () => {
    const decision = decideUnfinishedSession({
      nowMs: started + 900_000,
      startedAtMs: started,
      chosenDurationSeconds: chosen,
      backgroundedAtMs: null,
      returnKind: 'cold-start',
    });
    assert.equal(decision.kind, 'aborted');
    if (decision.kind === 'aborted') {
      assert.equal(decision.actualDurationSeconds, 600);
      assert.equal(decision.endedAtMs, started + 600_000);
    }
  });
});

describe('elapsedSeconds', () => {
  it('never exceeds the chosen duration', () => {
    assert.equal(elapsedSeconds(started, started + 5_000, 600), 5);
    assert.equal(elapsedSeconds(started, started + 900_000, 600), 600);
    assert.equal(elapsedSeconds(started, started - 1_000, 600), 0);
  });
});
