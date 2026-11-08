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
  PART1_DURATION_INGRESS,
  PART1_ROUTES,
  practiceWelcomeReady,
} from './flow.ts';
import { RING_OFFSET } from '../session/holdToEnd.ts';
import {
  BROAD_SECTOR_DEG,
  GUMMI_SECTOR_DEG,
  contourInPoints,
  deform,
  emptyOffsets,
  FORM_BINS,
  outsetContour,
  radiusLimitsPt,
  sectorRadians,
  velvetTravel,
} from './formShape.ts';

describe('bli kjent flow', () => {
  it('asks for duration once, then continues, and does not ask again in Del 2', () => {
    assert.equal(BLI_KJENT_STEPS, 5);
    assert.deepEqual(confirmDuration(20), { minutes: 20, to: 'rom' });
    assert.equal(QUESTIONS.goal.next, '/onboarding/time');
    assert.equal(ONBOARDING_STEPS, 6);
    assert.equal(QUESTIONS.time.step, 3);
  });

  it('keeps every Part 1 step mandatory and leaves Veiskille able to skip Del 2', () => {
    const root = process.cwd();
    const dir = join(root, 'src/app/onboarding');
    for (const route of PART1_ROUTES) {
      const source = readFileSync(join(dir, `${route}.tsx`), 'utf8');
      assert.equal(source.includes('Hopp over'), false, route);
      assert.equal(source.includes('skipBliKjent'), false, route);
      assert.equal(source.includes('velkommen'), route === 'ov', route);
    }
    const tid = readFileSync(join(dir, 'tid.tsx'), 'utf8');
    assert.match(tid, /PART1_DURATION_INGRESS/);
    assert.equal(PART1_DURATION_INGRESS, 'Hvor lenge tror du at du klarer å kjede deg om gangen?');
    assert.match(tid, /onConfirm=\{save\}/);
    assert.doesNotMatch(tid, /onSkip/);
    assert.match(tid, /router\.push\('\/onboarding\/rom'\)/);
    const veiskille = readFileSync(join(dir, 'veiskille.tsx'), 'utf8');
    assert.match(veiskille, /Hopp over og start første økt/);
    assert.match(veiskille, /replace\('\/session'\)/);
    const name = readFileSync(join(dir, 'name.tsx'), 'utf8');
    assert.match(name, /title="Hopp over"/);
    const questions = readFileSync(join(root, 'src/components/QuestionStep.tsx'), 'utf8');
    assert.match(questions, /<OnboardingHeader/);
    assert.doesNotMatch(questions, /dots=\{false\}/);
  });

  it('drops the Part 1 dots and the stack pop, and keeps the duration pan on the stone', () => {
    const root = process.cwd();
    const dir = join(root, 'src/app/onboarding');
    const header = readFileSync(join(root, 'src/components/OnboardingHeader.tsx'), 'utf8');
    const layout = readFileSync(join(dir, '_layout.tsx'), 'utf8');
    const chooser = readFileSync(join(root, 'src/components/DurationChooser.tsx'), 'utf8');
    assert.match(header, /accessibilityLabel="Tilbake"/);
    assert.match(header, /router\.back\(\)/);
    assert.match(header, /dots \? <ProgressDots/);
    assert.doesNotMatch(header, /updateUser/);
    for (const route of PART1_ROUTES) {
      if (route === 'index') continue;
      const source = readFileSync(join(dir, `${route}.tsx`), 'utf8');
      assert.match(source, /dots=\{false\}/, route);
    }
    assert.match(layout, /gestureEnabled: true/);
    assert.match(layout, /PART1_ROUTES\.map/);
    assert.match(layout, /gestureEnabled: false/);
    assert.match(layout, /fullScreenGestureEnabled: false/);
    assert.match(chooser, /PanResponder/);
    assert.match(chooser, /stoneReleaseAction/);
    assert.match(chooser, /accessibilityHint=\{DURATION_ADJUST_HINT\}/);
    assert.doesNotMatch(chooser, />\{DURATION_ADJUST_HINT\}<\/Text>/);
    assert.doesNotMatch(chooser, /from 'expo-router'|router\.back|Hopp over|onSkip/);
    const sheet = readFileSync(join(root, 'src/duration/klumpen.ts'), 'utf8');
    assert.match(sheet, /Hvor lang tid har du i dag\?/);
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
    const stone = readFileSync(join(process.cwd(), 'src/components/LiveKlump.tsx'), 'utf8');
    const practice = readFileSync(join(process.cwd(), 'src/app/onboarding/ov.tsx'), 'utf8');
    const intro = readFileSync(join(process.cwd(), 'src/components/IntroStone.tsx'), 'utf8');
    const material = readFileSync(join(process.cwd(), 'src/materials/DynamicMaterial.tsx'), 'utf8');
    assert.match(stone, /useLiveMaterial/);
    assert.match(stone, /FixedRim/);
    assert.match(stone, /RING_OFFSET/);
    assert.match(stone, /outsetContour/);
    assert.match(intro, /LiveKlump/);
    assert.doesNotMatch(intro, /STONE_COLOR/);
    assert.match(practice, /drawProgress/);
    assert.doesNotMatch(practice, /borderRadius:\s*999/);
    assert.match(material, /kull\/glint\.png/);
    assert.doesNotMatch(material, /material !== 'kull'/);
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
    const early = deform({ start, material: 'skifer', minutes: 10, widthPt: 160, travelPt: 30, angle: 0, elapsedMs: 100 });
    assert.equal(early.changed, false);
    const later = deform({ start, material: 'skifer', minutes: 10, widthPt: 160, travelPt: 30, angle: 0, elapsedMs: 400 });
    assert.equal(later.changed, true);
    const gummiFar = deform({ start, material: 'gummi', minutes: 10, widthPt: 160, travelPt: 20, angle: 0 });
    const plastFar = deform({ start, material: 'emalje', minutes: 10, widthPt: 160, travelPt: 20, angle: 0 });
    const target = (50 * Math.PI) / 180;
    let bin = 0;
    let best = Infinity;
    for (let i = 0; i < FORM_BINS; i += 1) {
      const angle = -Math.PI + ((i + 0.5) / FORM_BINS) * Math.PI * 2;
      let delta = Math.abs(angle - target);
      if (delta > Math.PI) delta = Math.PI * 2 - delta;
      if (delta < best) {
        best = delta;
        bin = i;
      }
    }
    assert.equal(gummiFar.offsets[bin], 0);
    assert.notEqual(plastFar.offsets[bin], 0);
    assert.ok(sectorRadians('skifer', 160, 70) < (GUMMI_SECTOR_DEG * Math.PI) / 180);
    assert.equal(sectorRadians('gummi', 160, 70), (GUMMI_SECTOR_DEG * Math.PI) / 180);
    assert.equal(sectorRadians('floyel', 160, 70), (BROAD_SECTOR_DEG * Math.PI) / 180);
    const out = deform({ start, material: 'kull', minutes: 10, widthPt: 160, travelPt: 20, angle: 0, radial: 'out' });
    const inn = deform({ start, material: 'kull', minutes: 10, widthPt: 160, travelPt: 20, angle: 0, radial: 'in' });
    const peak = (values: number[]) => Math.max(...values.map((value) => Math.abs(value)));
    assert.ok(peak(inn.offsets) > peak(out.offsets));
    assert.ok(velvetTravel(0, 10, 80) > 5 && velvetTravel(0, 10, 80) < 8);
    assert.equal(velvetTravel(3, 10, 0), 3);
    const body = contourInPoints(emptyOffsets(), 160);
    const ring = outsetContour(body, RING_OFFSET);
    const radius = (points: { x: number; y: number }[]) => points.map((point) => Math.hypot(point.x, point.y));
    const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
    const bodyR = radius(body);
    const ringR = radius(ring);
    assert.ok(Math.abs(mean(ringR) - mean(bodyR) - RING_OFFSET) < 1.5);
    assert.ok(Math.max(...ringR) - Math.min(...ringR) > 8);
    const scale = 160 / 1000;
    for (let i = 0; i < moved.offsets.length; i += 1) {
      const angle = -Math.PI + ((i + 0.5) / FORM_BINS) * Math.PI * 2;
      const bound = radiusLimitsPt(10, 160, angle);
      const radius = (moved.offsets[i] ?? 0) * scale;
      assert.ok(radius <= bound.max + 0.01);
    }
  });
});
