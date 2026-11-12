import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { onboardingBeats, tabPress } from './screens.ts';
import { analyticsMemory, knappetrykk, setAnalyticsSink } from './track.ts';
import { mixpanelReady } from './mixpanel.ts';

describe('analytics adapter', () => {
  it('records a button press with skjerm and does not start Mixpanel without a token', () => {
    const seen: string[] = [];
    setAnalyticsSink((event) => {
      seen.push(event.name);
    });
    const before = analyticsMemory().length;
    const event = knappetrykk({
      type: 'Knapp',
      navn: 'Jeg vil ha en sikkerhetskopi',
      hendelse: 'trykk',
      skjerm: 'sikkerhetskopi',
      notat: true,
      stemning: 'calm',
    });
    assert.deepEqual(seen, ['Knappetrykk']);
    assert.equal(event.props.skjerm, 'sikkerhetskopi');
    assert.equal(event.props.notat, true);
    assert.equal(event.props.stemning, 'calm');
    assert.equal(JSON.stringify(event.props).includes('Tenkte'), false);
    assert.equal(analyticsMemory().length, before + 1);
    assert.equal(mixpanelReady(), false);
  });

  it('marks a forward step complete and a back step only as seen again', () => {
    assert.deepEqual(onboardingBeats(null, 'Ingenting er målet', 'forward'), [
      { navn: 'Ingenting er målet', hendelse: 'vist', skjerm: 'Ingenting er målet' },
    ]);
    assert.deepEqual(onboardingBeats('Ingenting er målet', 'Hva er kjedsomhet?', 'forward'), [
      { navn: 'Ingenting er målet', hendelse: 'fullført', skjerm: 'Ingenting er målet' },
      { navn: 'Hva er kjedsomhet?', hendelse: 'vist', skjerm: 'Hva er kjedsomhet?' },
    ]);
    assert.deepEqual(onboardingBeats('Hva er kjedsomhet?', 'Ingenting er målet', 'back'), [
      { navn: 'Ingenting er målet', hendelse: 'vist', skjerm: 'Ingenting er målet' },
    ]);
  });

  it('counts a tab change and ignores the first paint', () => {
    assert.equal(tabPress('/onboarding', '/home'), null);
    assert.equal(tabPress('/home', '/home'), null);
    assert.equal(tabPress('/home', '/log'), 'Logg');
    assert.equal(tabPress('/log', '/profile'), 'Deg');
  });
});
