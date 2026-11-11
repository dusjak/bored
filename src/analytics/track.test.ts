import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { analyticsMemory, setAnalyticsSink, track } from './track.ts';

describe('analytics adapter', () => {
  it('records a backup interest tap once for the caller to gate', () => {
    const seen: string[] = [];
    setAnalyticsSink((event) => {
      seen.push(event.name);
    });
    const before = analyticsMemory().length;
    track('backup_screen_viewed', '2026-11-11T03:00:00.000Z');
    track('backup_interest_tapped', '2026-11-11T03:00:01.000Z');
    assert.deepEqual(seen, ['backup_screen_viewed', 'backup_interest_tapped']);
    assert.equal(analyticsMemory().length, before + 2);
    assert.equal(analyticsMemory().at(-1)?.name, 'backup_interest_tapped');
  });
});
