import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { QUESTIONS, ONBOARDING_STEPS } from '../data/mock.ts';
import { indexFromSwipe, SHEET_NUMBER_UNIT_GAP, NUMBER_UNIT_GAP, SWIPE_STEP } from '../duration/klumpen.ts';
import {
  BLI_KJENT_STEPS,
  confirmDuration,
  DURATION_LIST,
  durationPreviewLead,
  FORK_TITLE,
  PRACTICE_DIGIT_SIZE,
  PRACTICE_DONE,
  GUESS_HELP,
  GUESS_HINT,
  GUESS_TITLE,
  HOLD_CONTINUE_AFTER_MS,
  HOLD_TITLE,
  holdCountdown,
  KJEDOMHET_BODY,
  PART1_ROUTES,
  practiceContinueReady,
  reminderPreviewBody,
  summaryLead,
  summaryTitle,
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

/** A named default is not copied into a UI worklet, and Hermes throws when it runs. */
function workletNamedDefaults(source: string): string[] {
  const hits: string[] = [];
  const mark = /['"]worklet['"]/g;
  let found: RegExpExecArray | null;
  while ((found = mark.exec(source))) {
    const before = source.slice(0, found.index);
    const close = before.lastIndexOf(')');
    const open = before.lastIndexOf('(', close);
    if (open < 0 || close < 0) continue;
    const params = before.slice(open + 1, close);
    const named = params.match(/=\s*[A-Za-z_$][\w$]*/g);
    if (named) hits.push(...named);
  }
  return hits;
}

describe('bli kjent flow', () => {
  it('asks for duration once, then continues, and does not ask again in Del 2', () => {
    assert.equal(BLI_KJENT_STEPS, 7);
    assert.deepEqual(confirmDuration(20), { minutes: 20, to: 'ov' });
    assert.equal(QUESTIONS.goal.next, '/onboarding/duration');
    assert.equal(QUESTIONS.distraction.title, 'Hva griper du etter?');
    assert.equal(ONBOARDING_STEPS, 7);
    assert.equal(QUESTIONS.time.step, 4);
    assert.equal(DURATION_LIST[0]?.sub, 'En kort, daglig dose ingenting');
    assert.equal(DURATION_LIST[3]?.sub, 'Du mener alvor');
    assert.equal(durationPreviewLead(10), 'Ti minutter');
    assert.equal(durationPreviewLead(20), 'Tjue minutter');
  });

  it('keeps every Part 1 step mandatory and lets the bridge skip the questions', () => {
    const root = process.cwd();
    const dir = join(root, 'src/app/onboarding');
    const skip = new Set(['ov']);
    for (const route of PART1_ROUTES) {
      const source = readFileSync(join(dir, `${route}.tsx`), 'utf8');
      assert.equal(source.includes('Hopp over'), skip.has(route), route);
      assert.equal(source.includes('Tilbake'), false, route);
      assert.equal(source.includes('skipBliKjent'), false, route);
      assert.doesNotMatch(source, /LiveKlump|FormStone|formMotion|usePathValue/);
    }
    const index = readFileSync(join(dir, 'index.tsx'), 'utf8');
    assert.equal(index.includes('Jeg har allerede en konto'), false);
    assert.match(index, /SPLASH_REPLAY_HOLD_MS = 2000/);
    assert.match(index, /isSplashReplayEnabled/);
    assert.match(index, /replayIntroSplash\(\)/);
    assert.match(index, /Ingenting\\ner målet\./);
    assert.match(index, /top="app"/);
    assert.doesNotMatch(index, /top="welcome"/);
    const kjedomhet = readFileSync(join(dir, 'kjedomhet.tsx'), 'utf8');
    assert.match(kjedomhet, /KJEDOMHET_BODY/);
    assert.match(kjedomhet, /Hva er kjedsomhet\?/);
    assert.equal(KJEDOMHET_BODY.includes('—'), false);
    assert.match(kjedomhet, /Fortsett/);
    assert.match(kjedomhet, /digits=\{false\}/);
    assert.match(kjedomhet, /minutes=\{10\}/);
    assert.equal(existsSync(join(dir, 'form.tsx')), false);
    assert.equal(existsSync(join(dir, 'se.tsx')), false);
    assert.equal(existsSync(join(dir, 'alltid.tsx')), false);
    const tid = readFileSync(join(dir, 'tid.tsx'), 'utf8');
    const chooserSrc = readFileSync(join(root, 'src/components/DurationChooser.tsx'), 'utf8');
    assert.match(tid, /showChoices=\{false\}/);
    assert.match(tid, /GUESS_HINT/);
    assert.doesNotMatch(tid, /GummiPicture|stone=/);
    assert.match(chooserSrc, /rasterOnly/);
    assert.match(chooserSrc, /ghost/);
    assert.match(chooserSrc, /withSpring/);
    assert.match(chooserSrc, /styles\.hint/);
    assert.equal(GUESS_TITLE, 'Velg en tid du klarer');
    assert.equal(GUESS_HELP, 'Du kan endre den etter hver økt.');
    assert.equal(GUESS_HINT, 'Sveip for å endre tiden');
    assert.ok(indexFromSwipe(1, SWIPE_STEP) > indexFromSwipe(1, -SWIPE_STEP));
    assert.match(tid, /router\.push\('\/onboarding\/ov'\)/);
    assert.doesNotMatch(tid, /onSkip/);
    const veiskille = readFileSync(join(dir, 'veiskille.tsx'), 'utf8');
    assert.equal(FORK_TITLE, 'Nå kan du det viktigste');
    assert.match(veiskille, /FORK_LEAD/);
    assert.match(readFileSync(join(root, 'src/onboarding/flow.ts'), 'utf8'), /Vil du at vi tilpasser øktene til deg\?/);
    assert.match(veiskille, /Tilpass øktene/);
    assert.match(veiskille, /title="Hopp over"/);
    assert.match(veiskille, /introPath: 'skip'/);
    assert.match(veiskille, /pathname: '\/onboarding\/name'/);
    assert.doesNotMatch(veiskille, /replace\('\/session'\)|beginSession|completeOnboarding/);
    const name = readFileSync(join(dir, 'name.tsx'), 'utf8');
    assert.match(name, /title="Hopp over"/);
    assert.match(name, /KeyboardAvoidingView/);
    assert.match(name, /after === 'ready'/);
    const questions = readFileSync(join(root, 'src/components/QuestionStep.tsx'), 'utf8');
    assert.match(questions, /<OnboardingHeader/);
    assert.doesNotMatch(questions, /dots=\{false\}/);
    const picture = readFileSync(join(root, 'src/components/GummiPicture.tsx'), 'utf8');
    for (const size of [120, 160, 200, 240]) {
      assert.match(picture, new RegExp(`klumpen-gummi-${size}pt\\.png`));
      assert.equal(existsSync(join(root, `assets/hjem/klumpen-gummi-${size}pt@3x.png`)), true, String(size));
    }
    assert.doesNotMatch(picture, /useLiveMaterial|usePathValue|worklet/);
    assert.deepEqual(workletNamedDefaults(picture), []);
    assert.deepEqual(workletNamedDefaults(readFileSync(join(root, 'src/onboarding/formShape.ts'), 'utf8')), []);
    assert.deepEqual(workletNamedDefaults(readFileSync(join(root, 'src/components/LiveKlump.tsx'), 'utf8')), []);
    assert.equal(existsSync(join(root, 'src/components/FormStone.tsx')), false);
    assert.equal(existsSync(join(root, 'src/onboarding/formMotion.ts')), false);
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
    assert.doesNotMatch(layout, /gestureEnabled: true/);
    assert.match(layout, /gestureEnabled: false/);
    assert.match(layout, /fullScreenGestureEnabled: false/);
    const rootLayout = readFileSync(join(root, 'src/app/_layout.tsx'), 'utf8');
    assert.match(rootLayout, /name="onboarding" options=\{\{ gestureEnabled: false, fullScreenGestureEnabled: false \}\}/);
    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.tsx') || file === '_layout.tsx') continue;
      const source = readFileSync(join(dir, file), 'utf8');
      assert.equal(source.includes('gestureEnabled: true'), false, file);
      assert.equal(source.includes('pagingEnabled'), false, file);
    }
    assert.match(chooser, /PanResponder/);
    assert.match(chooser, /stoneReleaseAction/);
    assert.match(chooser, /accessibilityHint=\{DURATION_ADJUST_HINT\}/);
    assert.doesNotMatch(chooser, />\{DURATION_ADJUST_HINT\}<\/Text>/);
    assert.doesNotMatch(chooser, /from 'expo-router'|router\.back|Hopp over|onSkip/);
    const sheet = readFileSync(join(root, 'src/duration/klumpen.ts'), 'utf8');
    assert.match(sheet, /Hvor lang tid har du i dag\?/);
  });

  it('shows Fortsett after the hold, or after 30 seconds, and counts down from the guess', () => {
    assert.equal(practiceContinueReady(false, 0), false);
    assert.equal(practiceContinueReady(false, HOLD_CONTINUE_AFTER_MS - 1), false);
    assert.equal(practiceContinueReady(false, HOLD_CONTINUE_AFTER_MS), true);
    assert.equal(practiceContinueReady(true, 0), true);
    assert.equal(HOLD_TITLE.endsWith('.'), false);
    assert.equal(holdCountdown(20, 0), '20:00');
    assert.equal(holdCountdown(20, 1500), '19:59');
    assert.equal(holdCountdown(5, 5 * 60 * 1000), '0:00');
    assert.equal(summaryTitle('Dusan'), 'Dusan, la oss starte');
    assert.equal(summaryTitle('  '), 'La oss starte');
    assert.equal(summaryLead(10, 'om morgenen', 'mental ro'), 'Du starter med 10 minutter om morgenen, med mål om mental ro.');
    assert.equal(summaryLead(10), 'Du starter med 10 minutter.');
    assert.equal(reminderPreviewBody('Dusan', 10), 'Dusan, 10 minutter. Ingenting skjer her. Det er poenget.');
    assert.equal(reminderPreviewBody('  ', 5), '5 minutter. Ingenting skjer her. Det er poenget.');
    assert.equal(PRACTICE_DIGIT_SIZE, 48);
    assert.equal(PRACTICE_DONE, 'Avsluttet der');
  });

  it('does not put the unease card on Hjem', () => {
    const home = readFileSync(join(process.cwd(), 'src/app/(tabs)/home.tsx'), 'utf8');
    assert.equal(existsSync(join(process.cwd(), 'src/components/HomeUnease.tsx')), false);
    assert.doesNotMatch(home, /HomeUnease|Hvis du blir urolig|HOME_UNEASE/);
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

  it('keeps the session stone live and the practice stone a still picture', () => {
    const root = process.cwd();
    const veiskille = readFileSync(join(root, 'src/app/onboarding/veiskille.tsx'), 'utf8');
    assert.doesNotMatch(veiskille, /\/home|\/session/);
    const stone = readFileSync(join(root, 'src/components/LiveKlump.tsx'), 'utf8');
    const practice = readFileSync(join(root, 'src/app/onboarding/ov.tsx'), 'utf8');
    const ready = readFileSync(join(root, 'src/app/onboarding/ready.tsx'), 'utf8');
    const note = readFileSync(join(root, 'src/app/onboarding/notifications.tsx'), 'utf8');
    const material = readFileSync(join(root, 'src/materials/DynamicMaterial.tsx'), 'utf8');
    assert.match(stone, /useLiveMaterial/);
    assert.match(stone, /FixedRim/);
    assert.match(stone, /RING_OFFSET/);
    assert.match(stone, /outsetContour/);
    assert.match(practice, /GummiPicture/);
    assert.match(practice, /drawProgress/);
    assert.match(practice, /HOLD_PHASE_TEXT/);
    assert.match(practice, /HOLD_CONTINUE_AFTER_MS/);
    assert.match(practice, /PRACTICE_DONE/);
    assert.match(practice, /PracticeRing/);
    assert.match(practice, /holdCountdown\(minutes, clockMs\)/);
    assert.match(practice, /text\.link/);
    const ring = readFileSync(join(root, 'src/components/PracticeRing.tsx'), 'utf8');
    assert.match(ring, /SWEEP_NORTH = -Math\.PI \/ 2/);
    assert.match(ring, /SweepGradient/);
    assert.doesNotMatch(practice, /router\.push\('\/onboarding\/alltid'\)|borderRadius:\s*999|useLiveMaterial/);
    assert.match(ready, /summaryTitle\(user\.name\)/);
    assert.match(ready, /Start din første økt/);
    assert.doesNotMatch(ready, /Utforsk appen først|la oss starte\./);
    assert.match(note, /title="En stille påminnelse"/);
    assert.match(note, /opacity: enabled \? 1 : 0\.4/);
    assert.match(note, /reminderPreviewBody/);
    assert.match(note, /bored\./);
    assert.match(note, /icon-1024\.png/);
    const sessionStone = readFileSync(join(root, 'src/components/SessionKlumpen.tsx'), 'utf8');
    assert.match(sessionStone, /keepGummiRaster = material === 'gummi' && customRadii == null/);
    assert.match(sessionStone, /klumpen-okt-hvile\.png/);
    assert.match(sessionStone, /!keepGummiRaster/);
    const sessionScreen = readFileSync(join(root, 'src/app/session.tsx'), 'utf8');
    assert.match(sessionScreen, /handoff\.current/);
    assert.match(sessionScreen, /noteEntryRoute\(id\)/);
    assert.match(material, /kull\/glint\.png/);
    assert.doesNotMatch(material, /material !== 'kull'/);
    const chooser = readFileSync(join(root, 'src/components/DurationChooser.tsx'), 'utf8');
    assert.match(chooser, /SHEET_NUMBER_UNIT_GAP/);
    assert.equal(SHEET_NUMBER_UNIT_GAP, 0);
    assert.equal(NUMBER_UNIT_GAP, 4);
    const home = readFileSync(join(process.cwd(), 'src/app/(tabs)/home.tsx'), 'utf8');
    assert.doesNotMatch(home, /Hei,/);
    assert.doesNotMatch(home, /Hei\./);
    assert.doesNotMatch(home, /HomeUnease|Hvis du blir urolig/);
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
