import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { GOAL_LABELS, QUESTIONS } from './mock.ts';
import { GOAL_PRESENCE_ID, LEGACY_GOAL_ID, migrateProfile } from './profile.ts';

describe('stored onboarding goal', () => {
  it('names Tilstedeværelse autopilot', () => {
    const presence = QUESTIONS.goal.options.find((option) => option.label === 'Tilstedeværelse');
    assert.equal(presence?.id, GOAL_PRESENCE_ID);
    assert.equal(presence?.sub, 'Være mer til stede med meg selv');
    assert.equal(GOAL_LABELS[GOAL_PRESENCE_ID], 'tilstedeværelse');
    assert.equal(QUESTIONS.goal.options.some((option) => option.id === LEGACY_GOAL_ID), false);
  });

  it('rewrites a stored ensomhet answer and leaves the rest of the profile', () => {
    const stored = { goal: LEGACY_GOAL_ID, name: 'Ada', time: 'morgen' };
    const migrated = migrateProfile(stored);
    assert.equal(migrated.changed, true);
    assert.deepEqual(migrated.profile, { goal: GOAL_PRESENCE_ID, name: 'Ada', time: 'morgen' });
    assert.equal(stored.goal, LEGACY_GOAL_ID);
  });

  it('does not rewrite a profile that already uses the current id', () => {
    const stored = { goal: 'ro' };
    const migrated = migrateProfile(stored);
    assert.equal(migrated.changed, false);
    assert.equal(migrated.profile, stored);
    assert.equal(migrateProfile({}).changed, false);
  });
});
