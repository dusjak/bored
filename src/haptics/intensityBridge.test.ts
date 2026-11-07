import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { playTransientHaptic, transientHaptic } from './intensityBridge.ts';

describe('haptic intensity bridge', () => {
  it('keeps a numeric intensity instead of naming a style', () => {
    assert.deepEqual(transientHaptic(0.13, 0.4), { intensity: 0.13, sharpness: 0.4 });
    assert.deepEqual(transientHaptic(1.4, -0.2), { intensity: 1, sharpness: 0 });
    assert.equal(transientHaptic(Number.NaN, 0.2), null);
    const played: { intensity: number; sharpness: number }[] = [];
    const ok = playTransientHaptic(
      {
        playTransient(intensity, sharpness) {
          played.push({ intensity, sharpness });
          return true;
        },
      },
      0.2,
      0.5,
    );
    assert.equal(ok, true);
    assert.deepEqual(played, [{ intensity: 0.2, sharpness: 0.5 }]);
    assert.equal(playTransientHaptic(null, 0.2, 0.5), false);
    assert.equal(
      playTransientHaptic(
        {
          playTransient() {
            throw new Error('unavailable');
          },
        },
        0.2,
        0.5,
      ),
      false,
    );
  });

  it('is not wired into the hold clock or the session screen', () => {
    const session = readFileSync(join(process.cwd(), 'src/components/SessionKlumpen.tsx'), 'utf8');
    const app = readFileSync(join(process.cwd(), 'src/app/session.tsx'), 'utf8');
    assert.doesNotMatch(session, /intensityBridge|HapticIntensity|playTransientHaptic/);
    assert.doesNotMatch(app, /intensityBridge|HapticIntensity|playTransientHaptic/);
    assert.match(session, /phaseSent\.value === 1 \|\| phaseSent\.value === 2/);
    assert.match(session, /HOLD_TO_END_MS/);
  });
});
