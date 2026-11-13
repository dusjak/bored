import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { indexRoute } from './launchRoute.ts';

describe('index route', () => {
  it('sends an onboarded person with the stale onboarding launch home', () => {
    assert.equal(indexRoute({ launch: 'onboarding', onboarded: true, reflectionSessionId: null }), '/home');
    assert.equal(indexRoute({ launch: 'home', onboarded: true, reflectionSessionId: null }), '/home');
    assert.equal(indexRoute({ launch: 'reflection', onboarded: true, reflectionSessionId: null }), '/home');
  });

  it('sends someone who is not onboarded to onboarding', () => {
    assert.equal(indexRoute({ launch: 'onboarding', onboarded: false, reflectionSessionId: null }), '/onboarding');
    assert.equal(indexRoute({ launch: 'home', onboarded: false, reflectionSessionId: null }), '/onboarding');
  });

  it('sends a session launch to the session', () => {
    assert.equal(indexRoute({ launch: 'session', onboarded: true, reflectionSessionId: null }), '/session');
    assert.equal(indexRoute({ launch: 'session', onboarded: false, reflectionSessionId: 'left-over' }), '/session');
  });

  it('sends a reflection launch with an id to the note', () => {
    assert.deepEqual(indexRoute({ launch: 'reflection', onboarded: true, reflectionSessionId: 'session-1' }), {
      pathname: '/reflection',
      params: { sessionId: 'session-1' },
    });
  });

  it('sends Nullstill back to onboarding', () => {
    assert.equal(indexRoute({ launch: 'onboarding', onboarded: false, reflectionSessionId: null }), '/onboarding');
  });

  it('stores home when onboarding completes, and releases a cold-start session or reflection once it is left', () => {
    const state = readFileSync(new URL('./AppState.tsx', import.meta.url), 'utf8');
    const onboarding = state.slice(state.indexOf('const completeOnboarding'), state.indexOf('const releaseLaunch'));
    assert.match(onboarding, /setOnboarded\(true\);\n\s*setLaunch\('home'\)/);
    const release = state.slice(state.indexOf('const releaseLaunch'), state.indexOf('const beginSession'));
    assert.match(release, /current === 'session' \|\| current === 'reflection' \? 'home'/);
    const finished = state.slice(state.indexOf('const completeActiveSession'), state.indexOf('const noteBackground'));
    assert.match(finished, /releaseLaunch\(\)/);
    const reflection = readFileSync(new URL('../app/reflection.tsx', import.meta.url), 'utf8');
    const leaveAt = reflection.indexOf('const leave');
    const leave = reflection.slice(leaveAt, reflection.indexOf('const save', leaveAt));
    assert.match(leave, /knappetrykk\(/);
    assert.match(leave, /releaseLaunch\(\)/);
    const index = readFileSync(new URL('../app/index.tsx', import.meta.url), 'utf8');
    assert.match(index, /indexRoute\(/);
  });
});
