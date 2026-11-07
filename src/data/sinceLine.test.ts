import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { FIRST_USED_TRUSTED_KEY, sinceLinePlan, sinceLineText, trustedFirstUse } from './sinceLine.ts';

const NOW = '2026-11-07T06:00:00.000Z';
const OLD = '2024-03-02T12:00:00.000Z';

describe('since line', () => {
  it('shows a trusted instant and does not rewrite it', () => {
    const plan = sinceLinePlan({ trustedRaw: OLD, hasPriorData: true, nowIso: NOW });
    assert.equal(plan.displayIso, new Date(OLD).toISOString());
    assert.equal(plan.writeTrusted, null);
    assert.equal(sinceLineText(plan.displayIso), 'Kjedet deg siden mars 2024');
    assert.equal(FIRST_USED_TRUSTED_KEY, 'bored.firstUsedAt.trusted');
  });

  it('stores now once for an empty install', () => {
    const plan = sinceLinePlan({ trustedRaw: null, hasPriorData: false, nowIso: NOW });
    assert.equal(plan.displayIso, NOW);
    assert.equal(plan.writeTrusted, NOW);
  });

  it('omits the line for an existing install and does not copy an old key', () => {
    const plan = sinceLinePlan({ trustedRaw: null, hasPriorData: true, nowIso: NOW });
    assert.equal(plan.displayIso, null);
    assert.equal(plan.writeTrusted, null);
    assert.equal(sinceLineText(null), null);
    assert.equal(trustedFirstUse('not-a-date'), null);
    assert.equal(sinceLinePlan({ trustedRaw: 'not-a-date', hasPriorData: true, nowIso: NOW }).writeTrusted, null);
  });

  it('wires Deg to the trusted line and the inline wheel, not the time sheet', () => {
    const profile = readFileSync(join(process.cwd(), 'src/app/(tabs)/profile/index.tsx'), 'utf8');
    const state = readFileSync(join(process.cwd(), 'src/state/AppState.tsx'), 'utf8');
    assert.match(profile, /sinceLineText|boredSinceLine/);
    assert.match(profile, /<TimeWheel/);
    assert.equal(profile.includes('ReminderTimeSheet'), false);
    assert.match(state, /sinceLinePlan/);
    assert.equal(state.includes('getSetting(FIRST_USED_KEY)'), true);
    assert.equal(state.includes('setFirstUsedAt(known)'), false);
  });
});
