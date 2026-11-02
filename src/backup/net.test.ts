import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isOffline } from './netCheck.ts';

describe('isOffline', () => {
  it('blocks when the radio is off or the internet is unreachable', () => {
    assert.equal(isOffline({ isConnected: false, isInternetReachable: false }), true);
    assert.equal(isOffline({ isConnected: true, isInternetReachable: false }), true);
  });

  it('allows a connection and an unknown first reading', () => {
    assert.equal(isOffline({ isConnected: true, isInternetReachable: true }), false);
    assert.equal(isOffline({ isConnected: null, isInternetReachable: null }), false);
  });
});
