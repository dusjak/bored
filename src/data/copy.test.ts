import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  abortedPhrase,
  completionSentence,
  minutesPhrase,
  parseCustomMinutes,
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

  it('accepts a custom duration only from 3 to 30', () => {
    assert.equal(parseCustomMinutes('2'), null);
    assert.equal(parseCustomMinutes('3'), 3);
    assert.equal(parseCustomMinutes('30'), 30);
    assert.equal(parseCustomMinutes('31'), null);
    assert.equal(parseCustomMinutes('10.5'), null);
    assert.equal(parseCustomMinutes(''), null);
  });
});
