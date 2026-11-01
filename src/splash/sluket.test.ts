import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { REDUCE_FADE_MS as STILL_FADE_MS, REDUCE_HOLD_MS as STILL_HOLD_MS } from './splashTiming.ts';
import {
  REDUCE_FADE_MS,
  REDUCE_HOLD_MS,
  createStimuli,
  cubicBezierY,
  GOO_MATRIX,
  gooSigma,
  holeDiameter,
  HANDOVER_AT,
  LOW_POWER_COUNT,
  MAX_TURNS,
  MORPH_COUNT,
  NOISE_HEX,
  periodShift,
  REST_AT,
  samplePose,
  sampleStimulus,
  SIGMA_MAX,
  spinTurns,
  springAt,
  STIMULUS_COUNT,
  stimulusBudget,
  wobbleAmp,
  wordmarkDraw,
  wordmarkFrame,
  wordMask,
  WORDMARK_H,
  WORDMARK_W,
  writeBlob,
} from './sluket.ts';

describe('sluket v2', () => {
  it('shares the reduce-motion timings with the launch path', () => {
    assert.equal(REDUCE_HOLD_MS, STILL_HOLD_MS);
    assert.equal(REDUCE_FADE_MS, STILL_FADE_MS);
  });

  it('builds 96 stimuli, 24 of them morphs, largest first', () => {
    const stimuli = createStimuli();
    assert.equal(stimuli.length, STIMULUS_COUNT);
    assert.equal(stimuli.filter((item) => item.morph).length, MORPH_COUNT);
    assert.deepEqual(createStimuli(), stimuli);
    assert.equal(stimuli.filter((item) => item.hex === '#FF3B30').length, STIMULUS_COUNT / NOISE_HEX.length);
    for (let i = 0; i < stimuli.length; i += 1) {
      const item = stimuli[i]!;
      assert.ok(item.size >= 24 && item.size <= 490);
      assert.ok(item.r0 >= 0.15 && item.r0 <= 0.75);
      assert.ok(item.flake >= 2 && item.flake <= 20);
      assert.ok(item.delay >= 0 && item.delay <= 160);
      if (i > 0) assert.ok(item.size <= stimuli[i - 1]!.size);
      if (i > 0) assert.ok(item.delay >= stimuli[i - 1]!.delay);
    }
    assert.equal(stimuli[0]!.delay, 0);
    assert.equal(stimuli[0]!.morph, true);
    assert.equal(stimuli[MORPH_COUNT]!.morph, false);
  });

  it('floods, tightens, and is gone before the rest frame', () => {
    const stimulus = createStimuli()[0]!;
    assert.equal(samplePose(stimulus, 0, 100, 402, 874, 0), null);
    const early = samplePose(stimulus, 0, 450, 402, 874, 0);
    const later = samplePose(stimulus, 0, 700, 402, 874, 0);
    assert.ok(early && later);
    const centre = 201;
    const mid = 437;
    const earlyOrbit = Math.hypot(early.x - centre, early.y - mid);
    const laterOrbit = Math.hypot(later.x - centre, later.y - mid);
    assert.ok(laterOrbit < earlyOrbit);
    assert.ok(later.mix >= early.mix);
    assert.ok(later.r < early.r);
    const tight = samplePose(stimulus, 0, 1100, 402, 874, 0);
    assert.ok(tight);
    assert.ok(tight.scaleX > 1);
    assert.ok(tight.scaleY < 1);
    assert.equal(samplePose(stimulus, 0, REST_AT, 402, 874, 0), null);
  });

  it('drops to 64 shapes with no morph under the low-power budget', () => {
    assert.deepEqual(stimulusBudget(0, 0), [STIMULUS_COUNT, SIGMA_MAX, 1]);
    assert.deepEqual(stimulusBudget(1, 0), [LOW_POWER_COUNT, 8, 0]);
    assert.deepEqual(stimulusBudget(0, 3), [LOW_POWER_COUNT, 8, 0]);
    const stimulus = createStimuli()[70]!;
    assert.equal(samplePose(stimulus, 70, 500, 402, 874, 1), null);
    assert.ok(samplePose(stimulus, 10, 500, 402, 874, 0));
    const hidden = sampleStimulus(70, stimulus.delay, stimulus.angle, stimulus.spin, stimulus.r0, stimulus.size, stimulus.flake, 500, 402, 874, 1);
    assert.equal(hidden[0], 0);
  });

  it('caps the spin at 1.25 turns and eases in', () => {
    assert.equal(spinTurns(0), 0);
    assert.equal(spinTurns(380), 0);
    assert.ok(spinTurns(590) < 0.375);
    assert.ok(Math.abs(spinTurns(800) - 0.75) < 1e-9);
    assert.equal(spinTurns(1250), MAX_TURNS);
    assert.equal(spinTurns(2000), MAX_TURNS);
    assert.ok(springAt(0.2, 0, 1, 14, 380, 0.6) > 1);
  });

  it('opens on the wordmark, rests on the same frame, and parks the hole on the baseline centre', () => {
    const frame = wordmarkFrame(402, 874);
    assert.deepEqual(frame, { x: 121, y: 397, width: WORDMARK_W, height: WORDMARK_H });
    for (const t of [0, 1700]) {
      const draw = wordmarkDraw(t, 402, 874);
      assert.equal(draw.opacity, 1);
      assert.equal(draw.translateX, 0);
      assert.equal(draw.translateY, 0);
      assert.equal(draw.scale, 1);
      assert.equal(draw.clipLeft, 0);
      assert.equal(draw.holeR, 0);
    }
    assert.equal(wordMask(120), 1);
    assert.equal(periodShift(120), 0);
    assert.equal(wordMask(1700), 0);
    assert.equal(periodShift(1700), 1);
    assert.equal(holeDiameter(1100), 10);
    assert.ok(holeDiameter(1140) > 11);
    assert.equal(holeDiameter(1700), 0);
    const mid = wordmarkDraw(60, 402, 874);
    assert.ok(mid.clipLeft > 0);
    assert.ok(mid.translateX < 0);
    assert.equal(wordmarkDraw(2000, 402, 874).scale, 0);
  });

  it('keeps the goo inside the budget', () => {
    assert.equal(GOO_MATRIX.length, 20);
    assert.equal(GOO_MATRIX[18], 18);
    assert.equal(GOO_MATRIX[19], -7);
    assert.equal(gooSigma(200, false), 4);
    assert.ok(gooSigma(600, false) > 4 && gooSigma(600, false) < 10);
    assert.ok(gooSigma(1000, false) > 10 && gooSigma(1000, false) <= SIGMA_MAX);
    assert.equal(gooSigma(1000, true), 8);
    assert.equal(wobbleAmp(200), 0.04);
    assert.ok(wobbleAmp(900) > 0.16);
  });

  it('builds every blob from 8 cubics', () => {
    for (const kind of [0, 1, 2]) {
      let cubics = 0;
      let closed = false;
      writeBlob(
        {
          moveTo() {},
          cubicTo() {
            cubics += 1;
          },
          close() {
            closed = true;
          },
        },
        kind,
        10,
        20,
        40,
        0.16,
        0.4,
        1,
        1.2,
        0.8,
        0.3,
      );
      assert.equal(cubics, 8);
      assert.equal(closed, true);
    }
  });

  it('marks every function a worklet calls as a worklet', () => {
    const timeline = readFileSync(new URL('./sluket.ts', import.meta.url), 'utf8');
    const play = readFileSync(new URL('../components/SluketPlay.tsx', import.meta.url), 'utf8');
    const still = readFileSync(new URL('../components/StillSplash.tsx', import.meta.url), 'utf8');
    const defined = functionBodies(timeline);
    const worklets = new Set([...defined.entries()].filter(([, fn]) => fn.worklet).map(([name]) => name));
    for (const name of [
      'clamp01',
      'lerp',
      'bezier',
      'bezierSlope',
      'cubicBezierY',
      'springAt',
      'smoothstep',
      'wordMask',
      'periodShift',
      'holeDiameter',
      'handoverScale',
      'gooSigma',
      'wobbleAmp',
      'spinTurns',
      'stimulusBudget',
      'sampleStimulus',
      'writeBlob',
      'wordmarkDraw',
    ]) {
      assert.equal(worklets.has(name), true, `${name} is missing 'worklet'`);
    }
    for (const [name, fn] of defined) {
      if (!fn.worklet) continue;
      for (const callee of callsIn(fn.body)) {
        const target = defined.get(callee);
        if (!target) continue;
        assert.equal(target.worklet, true, `${name} calls ${callee}, which is not a worklet`);
      }
    }
    const uiBodies = [
      ...callbackBodies(play, 'useFrameCallback'),
      ...callbackBodies(play, 'useCallback'),
      ...callbackBodies(play, 'useAnimatedReaction'),
      ...callbackBodies(play, 'useAnimatedStyle'),
      ...callbackBodies(play, 'usePathValue'),
      ...callbackBodies(play, 'runOnUI'),
    ];
    assert.ok(uiBodies.length >= 4);
    for (const body of uiBodies) {
      for (const callee of callsIn(body)) {
        const target = defined.get(callee);
        if (!target) continue;
        assert.equal(target.worklet, true, `a splash worklet calls ${callee}, which is not a worklet`);
      }
    }
    assert.equal(play.includes('lineHeight'), false);
    assert.equal(still.includes('lineHeight'), false);
    assert.equal(play.includes('<Text'), false);
    assert.equal(still.includes('<Text'), false);
    assert.match(play, /ColorMatrix/);
    assert.match(play, /usePathValue/);
    assert.equal(HANDOVER_AT, 1850);
  });

  it('uses an ease-in for the spin-up and an ease-out for the word', () => {
    assert.ok(cubicBezierY(0.4, 0, 1, 1, 0.5) < 0.5);
    assert.ok(cubicBezierY(0.22, 1, 0.36, 1, 0.5) > 0.5);
  });
});

function functionBodies(source: string): Map<string, { body: string; worklet: boolean }> {
  const found = new Map<string, { body: string; worklet: boolean }>();
  const header = /function\s+(\w+)/g;
  let match: RegExpExecArray | null;
  while ((match = header.exec(source))) {
    const name = match[1]!;
    const open = source.indexOf('{', match.index);
    let depth = 0;
    let end = open;
    for (let i = open; i < source.length; i += 1) {
      if (source[i] === '{') depth += 1;
      else if (source[i] === '}') {
        depth -= 1;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    const body = source.slice(open + 1, end);
    found.set(name, { body, worklet: /^\s*'worklet'/.test(body) });
  }
  return found;
}

function callbackBodies(source: string, callee: string): string[] {
  const bodies: string[] = [];
  const needle = `${callee}(`;
  let from = 0;
  while (from < source.length) {
    const at = source.indexOf(needle, from);
    if (at < 0) break;
    const open = source.indexOf('{', at);
    let depth = 0;
    let end = open;
    for (let i = open; i < source.length; i += 1) {
      if (source[i] === '{') depth += 1;
      else if (source[i] === '}') {
        depth -= 1;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    bodies.push(source.slice(open + 1, end));
    from = end + 1;
  }
  return bodies;
}

function callsIn(body: string): string[] {
  const names: string[] = [];
  const call = /(?<![.\w])([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = call.exec(body))) names.push(match[1]!);
  return names;
}
