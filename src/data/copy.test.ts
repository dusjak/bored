import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  abortedPhrase,
  clampDurationMinutes,
  completionSentence,
  minutesPhrase,
  parseCustomMinutes,
  reminderSchedule,
  sessionsPhrase,
} from './copy.ts';

describe('copy', () => {
  it('pluralises minutes and sessions', () => {
    assert.equal(minutesPhrase(1), '1 minutt');
    assert.equal(minutesPhrase(0), '0 minutter');
    assert.equal(minutesPhrase(12), '12 minutter');
    assert.equal(sessionsPhrase(0), '0 økter');
    assert.equal(sessionsPhrase(1), '1 økt');
    assert.equal(sessionsPhrase(28), '28 økter');
  });

  it('builds the done sentence from the chosen duration', () => {
    assert.equal(completionSentence(10), '10 minutter med ingenting.');
    assert.equal(completionSentence(1), '1 minutt med ingenting.');
  });

  it('does not round an aborted session under a minute up to 1', () => {
    assert.equal(abortedPhrase(0), 'Avsluttet etter under 1 min');
    assert.equal(abortedPhrase(59), 'Avsluttet etter under 1 min');
    assert.equal(abortedPhrase(60), 'Avsluttet etter 1 min');
    assert.equal(abortedPhrase(119), 'Avsluttet etter 1 min');
    assert.equal(abortedPhrase(120), 'Avsluttet etter 2 min');
  });

  it('accepts a custom duration only from 5 to 20 in whole minutes', () => {
    assert.equal(parseCustomMinutes('4'), null);
    assert.equal(parseCustomMinutes('5'), 5);
    assert.equal(parseCustomMinutes('10'), 10);
    assert.equal(parseCustomMinutes('20'), 20);
    assert.equal(parseCustomMinutes('21'), null);
    assert.equal(parseCustomMinutes('30'), null);
    assert.equal(parseCustomMinutes('10.5'), null);
    assert.equal(parseCustomMinutes(''), null);
  });

  it('uses 08:00 unless the reminder time is midday or evening', () => {
    assert.deepEqual(reminderSchedule('morgen'), { hour: 8, minute: 0, label: '08:00' });
    assert.deepEqual(reminderSchedule('lunsj'), { hour: 12, minute: 30, label: '12:30' });
    assert.deepEqual(reminderSchedule('kveld'), { hour: 20, minute: 0, label: '20:00' });
    assert.deepEqual(reminderSchedule(undefined), { hour: 8, minute: 0, label: '08:00' });
  });

  it('resets a stored length outside 5–20 to the default', () => {
    assert.equal(clampDurationMinutes(3), 10);
    assert.equal(clampDurationMinutes(30), 10);
    assert.equal(clampDurationMinutes(7), 7);
    assert.equal(clampDurationMinutes(10), 10);
  });
});
