import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { HOLD_A11Y_LABEL, HOLD_CONFIRM_END, HOLD_PHASE_TEXT } from '../data/copy.ts';
import { APP_WIPE_ROUTE, noteEntryRoute, routeWhenSessionMissing } from './resetRoute.ts';

describe('wipe versus the session note entry', () => {
  it('keeps Nullstill on onboarding and the session note on reflection with an id', () => {
    assert.equal(APP_WIPE_ROUTE, '/onboarding');
    assert.notEqual(APP_WIPE_ROUTE, '/log');
    assert.notEqual(APP_WIPE_ROUTE, '/home');
    const note = noteEntryRoute('session-1');
    assert.equal(note.pathname, '/reflection');
    assert.equal(note.params.sessionId, 'session-1');
    assert.equal(routeWhenSessionMissing(), '/home');
    assert.equal(HOLD_A11Y_LABEL, 'Avslutt økt');
    assert.equal(HOLD_CONFIRM_END, 'Avslutt');
    assert.equal(HOLD_PHASE_TEXT[0], 'Hold for å avslutte');
  });

  it('does not send the app wipe to Logg or Hjem, and still asks first', () => {
    const profile = readFileSync(join(process.cwd(), 'src/app/(tabs)/profile/index.tsx'), 'utf8');
    const index = readFileSync(join(process.cwd(), 'src/app/index.tsx'), 'utf8');
    const session = readFileSync(join(process.cwd(), 'src/app/session.tsx'), 'utf8');
    const klumpen = readFileSync(join(process.cwd(), 'src/components/SessionKlumpen.tsx'), 'utf8');
    const reflection = readFileSync(join(process.cwd(), 'src/app/reflection.tsx'), 'utf8');
    const tabs = readFileSync(join(process.cwd(), 'src/app/(tabs)/_layout.tsx'), 'utf8');
    assert.match(profile, /accessibilityLabel="Nullstill"/);
    assert.match(profile, /deviceIsOnline/);
    assert.match(profile, /CONFIRM_RESET/);
    assert.match(profile, /prepareReset/);
    assert.match(profile, /router\.replace\(APP_WIPE_ROUTE\)/);
    assert.doesNotMatch(profile, /NOTES_AFTER_RESET|notesAfterReset/);
    assert.doesNotMatch(profile, /router\.replace\('\/log'\)|router\.replace\('\/home'\)/);
    assert.doesNotMatch(index, /notesAfterReset|NOTES_AFTER_RESET/);
    assert.match(session, /noteEntryRoute\(id\)/);
    assert.match(session, /abortId\.current/);
    const settle = klumpen.indexOf('runOnJS(fireSettled)');
    const idle = klumpen.indexOf('if (!holding && !releasedRecently && !confirming && !moving)');
    assert.ok(settle > 0 && idle > settle);
    assert.match(reflection, /accessibilityLabel="Notat"/);
    assert.match(reflection, /sessionId/);
    assert.match(reflection, /Hopp over/);
    assert.match(tabs, />Logg</);
    assert.doesNotMatch(tabs, /Notater/);
  });
});
