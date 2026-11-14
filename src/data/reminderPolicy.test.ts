import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { dailyReminderSpec, reminderIsOn, shouldAskNotificationPermission } from './reminderPolicy.ts';

describe('daily reminder outside onboarding', () => {
  it('shows the switch on only when the stored choice and the system permission agree', () => {
    assert.equal(reminderIsOn(undefined, false), false);
    assert.equal(reminderIsOn(false, true), false);
    assert.equal(reminderIsOn(true, false), false);
    assert.equal(reminderIsOn(true, true), true);
  });

  it('asks for permission once, and does not ask again after a denial', () => {
    assert.equal(shouldAskNotificationPermission('undetermined'), true);
    assert.equal(shouldAskNotificationPermission('granted'), false);
    assert.equal(shouldAskNotificationPermission('denied'), false);
  });

  it('schedules a single daily alert', () => {
    const spec = dailyReminderSpec(8, 0);
    assert.equal(spec.identifier, 'bored.daily-reminder');
    assert.equal(spec.repeats, 'daily');
    assert.equal(spec.hour, 8);
    assert.equal(spec.minute, 0);
    assert.equal(dailyReminderSpec(21, 30).identifier, spec.identifier);
  });
});
