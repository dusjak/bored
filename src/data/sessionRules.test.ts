import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { decideUnfinishedSession, elapsedSeconds } from './sessionRules.ts';

const started = Date.parse('2026-10-18T12:00:00.000Z');
const chosen = 600;

describe('decideUnfinishedSession', () => {
  it('resumes when time is left', () => {
    const decision = decideUnfinishedSession({
      nowMs: started + 120_000,
      startedAtMs: started,
      chosenDurationSeconds: chosen,
    });
    assert.deepEqual(decision, { kind: 'resume', remainingSeconds: 480 });
  });

  it('completes from the scheduled end once that time has passed', () => {
    const decision = decideUnfinishedSession({
      nowMs: started + 900_000,
      startedAtMs: started,
      chosenDurationSeconds: chosen,
    });
    assert.deepEqual(decision, {
      kind: 'completed',
      actualDurationSeconds: 600,
      endedAtMs: started + 600_000,
    });
  });
});

describe('elapsedSeconds', () => {
  it('never exceeds the chosen duration', () => {
    assert.equal(elapsedSeconds(started, started + 5_000, 600), 5);
    assert.equal(elapsedSeconds(started, started + 900_000, 600), 600);
    assert.equal(elapsedSeconds(started, started - 1_000, 600), 0);
  });
});
