import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { QUESTIONS, ONBOARDING_STEPS } from '../data/mock.ts';
import { SHEET_NUMBER_UNIT_GAP, NUMBER_UNIT_GAP } from '../duration/klumpen.ts';
import {
  BLI_KJENT_STEPS,
  confirmDuration,
  homeUneaseState,
  practiceWelcomeReady,
  skipBliKjent,
} from './flow.ts';
import { deform, FORM_BINS, radiusLimitsPt } from './formShape.ts';

describe('bli kjent flow', () => {
  it('asks for duration once, then continues, and does not ask again in Del 2', () => {
    assert.equal(BLI_KJENT_STEPS, 5);
    assert.deepEqual(confirmDuration(20), { minutes: 20, to: 'rom' });
    assert.equal(skipBliKjent('tid', 20).minutes, 10);
    assert.equal(skipBliKjent('tid', 20).to, 'rom');
    assert.equal(QUESTIONS.goal.next, '/onboarding/time');
    assert.equal(ONBOARDING_STEPS, 6);
    assert.equal(QUESTIONS.time.step, 3);
  });

  it('skips A1 to Velkommen at 10, and later skips keep the confirmed minutes', () => {
    assert.deepEqual(skipBliKjent('a1', 20), { minutes: 10, to: 'velkommen' });
    assert.deepEqual(skipBliKjent('rom', 15), { minutes: 15, to: 'velkommen' });
    assert.deepEqual(skipBliKjent('ov', 20), { minutes: 20, to: 'velkommen' });
  });

  it('opens Til velkommen only after the practice hold', () => {
    assert.equal(practiceWelcomeReady(false), false);
    assert.equal(practiceWelcomeReady(true), true);
  });

  it('keeps the Hjem unease window and latches it shut', () => {
    const none: { id: string; status: 'completed' | 'aborted'; endedAt: string }[] = [];
    assert.deepEqual(homeUneaseState('del2', none, false), { show: true, latch: false });
    assert.deepEqual(homeUneaseState('del2', [{ id: 'a', status: 'aborted', endedAt: '1' }], false), {
      show: true,
      latch: false,
    });
    assert.deepEqual(homeUneaseState('del2', [{ id: 'c', status: 'completed', endedAt: '2' }], false), {
      show: false,
      latch: true,
    });
    assert.deepEqual(homeUneaseState('skip', none, false), { show: false, latch: false });
    assert.deepEqual(homeUneaseState('skip', [{ id: 'a', status: 'aborted', endedAt: '1' }], false), {
      show: true,
      latch: false,
    });
    assert.deepEqual(
      homeUneaseState(
        'skip',
        [
          { id: 'a', status: 'completed', endedAt: '1' },
          { id: 'b', status: 'aborted', endedAt: '2' },
        ],
        false,
      ),
      { show: true, latch: false },
    );
    assert.deepEqual(
      homeUneaseState(
        'skip',
        [
          { id: 'a', status: 'completed', endedAt: '1' },
          { id: 'b', status: 'completed', endedAt: '2' },
        ],
        false,
      ),
      { show: false, latch: true },
    );
    assert.deepEqual(homeUneaseState('del2', none, true), { show: false, latch: true });
    assert.deepEqual(homeUneaseState(undefined, none, false), { show: false, latch: false });
  });

  it('does not put the unease line or a greeting on an onboarding screen', () => {
    const dir = join(process.cwd(), 'src/app/onboarding');
    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.tsx')) continue;
      const source = readFileSync(join(dir, file), 'utf8');
      assert.equal(source.includes('Hvis du blir urolig'), false, file);
      assert.equal(source.includes('Hei,'), false, file);
      assert.equal(source.includes('Hei.'), false, file);
    }
  });

  it('starts the skip session directly and keeps the sheet gap off the Hjem correction', () => {
    const veiskille = readFileSync(join(process.cwd(), 'src/app/onboarding/veiskille.tsx'), 'utf8');
    assert.match(veiskille, /replace\('\/session'\)/);
    assert.doesNotMatch(veiskille, /\/home/);
    const chooser = readFileSync(join(process.cwd(), 'src/components/DurationChooser.tsx'), 'utf8');
    assert.match(chooser, /SHEET_NUMBER_UNIT_GAP/);
    assert.equal(SHEET_NUMBER_UNIT_GAP, 0);
    assert.equal(NUMBER_UNIT_GAP, 4);
    const home = readFileSync(join(process.cwd(), 'src/app/(tabs)/home.tsx'), 'utf8');
    assert.doesNotMatch(home, /Hei,/);
    assert.doesNotMatch(home, /Hei\./);
  });
});

describe('form drag', () => {
  it('ignores a drag inside the threshold and keeps the text field', () => {
    const start = Array.from({ length: FORM_BINS }, () => 0);
    const quiet = deform({ start, material: 'gummi', minutes: 10, widthPt: 160, travelPt: 5, angle: 0 });
    assert.equal(quiet.changed, false);
    const moved = deform({ start, material: 'gummi', minutes: 10, widthPt: 160, travelPt: 20, angle: 0 });
    assert.equal(moved.changed, true);
    const limits = radiusLimitsPt(10, 160, 0);
    assert.ok(limits.min < limits.max);
    const scale = 160 / 1000;
    for (let i = 0; i < moved.offsets.length; i += 1) {
      const angle = -Math.PI + ((i + 0.5) / FORM_BINS) * Math.PI * 2;
      const bound = radiusLimitsPt(10, 160, angle);
      const radius = (moved.offsets[i] ?? 0) * scale;
      assert.ok(radius <= bound.max + 0.01);
    }
  });
});
