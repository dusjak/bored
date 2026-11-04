import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  abortedPhrase,
  boredSinceLine,
  earliestIso,
  formatClock,
  parseClock,
  resolveReminderClock,
  APPEARANCE_CONFIRM,
  APPEARANCE_OPTIONS,
  APPEARANCE_SYSTEM_CAPTION,
  appearanceLabel,
  clampDurationMinutes,
  completionSentence,
  durationParts,
  HOLD_A11Y_HINT,
  HOLD_A11Y_LABEL,
  HOLD_CONFIRM_CONTINUE,
  HOLD_CONFIRM_END,
  HOLD_CONFIRM_TITLE,
  HOLD_DONE_TEXT,
  HOLD_PHASE_TEXT,
  HOLD_TO_END_MS,
  minutesPhrase,
  parseCustomMinutes,
  LOCK_HINT_WITH_NOTIFICATION,
  LOCK_HINT_WITHOUT_NOTIFICATION,
  lockHintCopy,
  lockHintSpeech,
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

  it('splits a duration so the number can sit in a different face', () => {
    assert.deepEqual(durationParts(10), { value: '10', unit: 'minutter' });
    assert.deepEqual(durationParts(1), { value: '1', unit: 'minutt' });
    assert.deepEqual(durationParts(1.9), { value: '1', unit: 'minutt' });
    assert.equal(minutesPhrase(10), `${durationParts(10).value} ${durationParts(10).unit}`);
  });

  it('names the Deg appearance choices in sheet order', () => {
    assert.deepEqual(
      APPEARANCE_OPTIONS.map((option) => option.label),
      ['Lys', 'Mørk', 'Automatisk'],
    );
    assert.equal(appearanceLabel('light'), 'Lys');
    assert.equal(appearanceLabel('dark'), 'Mørk');
    assert.equal(appearanceLabel('system'), 'Automatisk');
    assert.equal(APPEARANCE_SYSTEM_CAPTION, 'Automatisk følger telefonen.');
    assert.equal(APPEARANCE_CONFIRM, 'Velg');
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

  it('keeps the hold-to-end placeholders in one list', () => {
    assert.equal(HOLD_TO_END_MS, 4000);
    assert.deepEqual(HOLD_PHASE_TEXT, ['Hold for å avslutte', 'Fortsett å holde …', 'Litt til …']);
    assert.equal(HOLD_DONE_TEXT, 'Avsluttet');
    assert.equal(HOLD_A11Y_LABEL, 'Avslutt økt');
    assert.equal(HOLD_A11Y_HINT, 'Dobbelttrykk for å avslutte');
    assert.equal(HOLD_CONFIRM_TITLE, 'Avslutte økten?');
    assert.equal(HOLD_CONFIRM_END, 'Avslutt');
    assert.equal(HOLD_CONFIRM_CONTINUE, 'Fortsett');
  });

  it('keeps the lock-hint variants in one place', () => {
    assert.equal(lockHintCopy(true), LOCK_HINT_WITH_NOTIFICATION);
    assert.equal(lockHintCopy(false), LOCK_HINT_WITHOUT_NOTIFICATION);
    assert.equal(LOCK_HINT_WITH_NOTIFICATION, 'Lås skjermen, vi gir deg\net varsel når tiden har gått ut.');
    assert.equal(LOCK_HINT_WITHOUT_NOTIFICATION, 'Lås skjermen. Økten går videre i bakgrunnen.');
    assert.equal(lockHintSpeech(true), 'Lås skjermen, vi gir deg et varsel når tiden har gått ut.');
    assert.equal(lockHintSpeech(false), LOCK_HINT_WITHOUT_NOTIFICATION);
  });

  it('prefers a saved clock and otherwise uses the onboarding answer', () => {
    assert.deepEqual(parseClock('8:00'), { hour: 8, minute: 0 });
    assert.deepEqual(parseClock('12:32'), { hour: 12, minute: 30 });
    assert.deepEqual(parseClock('23:58'), { hour: 0, minute: 0 });
    assert.equal(parseClock('morgen'), null);
    assert.equal(parseClock(undefined), null);
    assert.equal(formatClock(8, 0), '08:00');
    assert.deepEqual(resolveReminderClock('lunsj', undefined), { hour: 12, minute: 30, label: '12:30' });
    assert.deepEqual(resolveReminderClock('lunsj', '07:15'), { hour: 7, minute: 15, label: '07:15' });
    assert.deepEqual(resolveReminderClock(undefined, undefined), { hour: 8, minute: 0, label: '08:00' });
  });

  it('names the month the app was first used', () => {
    assert.equal(boredSinceLine(new Date(2026, 9, 4)), 'Kjedet deg siden oktober 2026');
    assert.equal(boredSinceLine(new Date(2026, 0, 1)), 'Kjedet deg siden januar 2026');
    const now = new Date('2026-11-04T12:00:00.000Z');
    assert.equal(earliestIso([null, 'not-a-date'], now), now.toISOString());
    assert.equal(earliestIso(['2026-11-01T00:00:00.000Z', '2026-10-02T00:00:00.000Z'], now), '2026-10-02T00:00:00.000Z');
  });

  it('resets a stored length outside 5–20 to the default', () => {
    assert.equal(clampDurationMinutes(3), 10);
    assert.equal(clampDurationMinutes(30), 10);
    assert.equal(clampDurationMinutes(7), 7);
    assert.equal(clampDurationMinutes(10), 10);
  });
});
