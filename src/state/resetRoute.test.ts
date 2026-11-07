import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { NOTES_AFTER_RESET, routeWhenSessionCleared } from './resetRoute.ts';

describe('Nullstill landing', () => {
  it('sends a cleared session to the notes list, and an ordinary miss to Hjem', () => {
    assert.equal(NOTES_AFTER_RESET, '/log');
    assert.equal(routeWhenSessionCleared(true), '/log');
    assert.notEqual(routeWhenSessionCleared(true), '/home');
    assert.equal(routeWhenSessionCleared(false), '/home');
  });

  it('keeps the reset safeguards and does not replace them with Hjem', () => {
    const profile = readFileSync(join(process.cwd(), 'src/app/(tabs)/profile/index.tsx'), 'utf8');
    const index = readFileSync(join(process.cwd(), 'src/app/index.tsx'), 'utf8');
    const session = readFileSync(join(process.cwd(), 'src/app/session.tsx'), 'utf8');
    const reflection = readFileSync(join(process.cwd(), 'src/app/reflection.tsx'), 'utf8');
    assert.match(profile, /deviceIsOnline/);
    assert.match(profile, /CONFIRM_RESET/);
    assert.match(profile, /prepareReset/);
    assert.match(profile, /NOTES_AFTER_RESET/);
    assert.doesNotMatch(profile, /router\.replace\('\/home'\)/);
    assert.match(index, /notesAfterReset/);
    assert.match(index, /NOTES_AFTER_RESET/);
    assert.match(session, /routeWhenSessionCleared/);
    assert.match(session, /pathname: '\/reflection'/);
    assert.match(reflection, /Hopp over/);
    assert.match(reflection, /Lagre/);
    assert.match(reflection, /router\.replace\('\/home'\)/);
  });
});
