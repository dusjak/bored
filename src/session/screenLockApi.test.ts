import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { bindScreenLock, SCREEN_LOCK_EVENT } from './screenLockApi.ts';

describe('screen lock fallback', () => {
  it('does nothing and does not throw when the native module is missing', () => {
    const missing = bindScreenLock(null);
    assert.equal(missing.available, false);
    const subscription = missing.addLockListener(() => {
      throw new Error('listener should not be installed');
    });
    assert.equal(typeof subscription.remove, 'function');
    subscription.remove();
    assert.equal(bindScreenLock(undefined).available, false);
  });

  it('forwards a lock and survives a native listener that throws', () => {
    let heard = 0;
    const native = bindScreenLock({
      addListener(event, listener) {
        assert.equal(event, SCREEN_LOCK_EVENT);
        listener();
        return { remove() { heard += 1; } };
      },
    });
    assert.equal(native.available, true);
    const subscription = native.addLockListener(() => undefined);
    subscription.remove();
    assert.equal(heard, 1);

    const broken = bindScreenLock({
      addListener() {
        throw new Error('Expo Go refused the module');
      },
    });
    const safe = broken.addLockListener(() => undefined);
    safe.remove();
  });
});
