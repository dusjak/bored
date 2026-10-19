import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { REDUCE_FADE_MS as STILL_FADE_MS, REDUCE_HOLD_MS as STILL_HOLD_MS } from './splashTiming.ts';
import {
  createStimuli,
  cubicBezierY,
  NOISE_RGB,
  periodScale,
  REDUCE_FADE_MS,
  REDUCE_HOLD_MS,
  sampleMotion,
  sampleStimulus,
  spiralAngle,
  STIMULUS_COUNT,
  wordReveal,
  type Rgb,
} from './sluket.ts';

const LIGHT_HOLE: Rgb = [0x11, 0x11, 0x10];
const DARK_HOLE: Rgb = [0xf8, 0xf6, 0xf2];

describe('sluket', () => {
  it('shares the still-splash timings with the launch path', () => {
    assert.equal(REDUCE_HOLD_MS, STILL_HOLD_MS);
    assert.equal(REDUCE_FADE_MS, STILL_FADE_MS);
    assert.equal(STILL_HOLD_MS, 600);
    assert.equal(STILL_FADE_MS, 200);
  });

  it('builds 60 stimuli with the shape split and a stable seed', () => {
    const stimuli = createStimuli();
    assert.equal(stimuli.length, STIMULUS_COUNT);
    assert.equal(stimuli.filter((item) => item.kind === 'badge').length, 36);
    assert.equal(stimuli.filter((item) => item.kind === 'pill').length, 18);
    assert.equal(stimuli.filter((item) => item.kind === 'squircle').length, 6);
    assert.deepEqual(createStimuli(), stimuli);
    for (const item of stimuli) {
      assert.ok(item.r0 >= 0.6 && item.r0 <= 0.8);
      assert.ok(item.drift <= (30 * Math.PI) / 180 + 1e-9);
      assert.equal(item.spiral, spiralAngle(item.drift));
      assert.equal(item.hex.startsWith('#'), true);
      assert.ok(item.drift + spiralAngle(item.drift) <= Math.PI * 2 + 1e-9);
      assert.ok(item.delay >= 0 && item.delay <= 300);
      assert.ok(NOISE_RGB.some((color) => color[0] === item.color[0] && color[1] === item.color[1] && color[2] === item.color[2]));
    }
  });

  it('keeps noise off screen until its delay, then swallows it', () => {
    const stimulus = createStimuli()[0]!;
    assert.equal(sampleStimulus(stimulus, 100 + stimulus.delay - 1, 390, 844, LIGHT_HOLE), null);
    const mid = sampleStimulus(stimulus, 400, 390, 844, LIGHT_HOLE);
    assert.ok(mid);
    assert.equal(sampleStimulus(stimulus, 1150, 390, 844, LIGHT_HOLE), null);
  });

  it('stretches and blends toward the hole in the last part of the spiral', () => {
    const stimulus = createStimuli()[3]!;
    const early = sampleStimulus(stimulus, 620, 390, 844, LIGHT_HOLE);
    const late = sampleStimulus(stimulus, 1140, 390, 844, LIGHT_HOLE);
    assert.ok(early && late);
    assert.ok(late.stretch > early.stretch);
    assert.ok(late.scale < early.scale);
    const lightDistance = late.color[0] - LIGHT_HOLE[0];
    const dark = sampleStimulus(stimulus, 1100, 390, 844, DARK_HOLE);
    assert.ok(dark);
    assert.notEqual(dark.color[0], late.color[0]);
    assert.ok(Math.abs(lightDistance) < Math.abs(stimulus.color[0] - LIGHT_HOLE[0]));
  });

  it('springs the period in, gulps, and shrinks it on the handover', () => {
    assert.equal(periodScale(0), 0);
    assert.ok(periodScale(80) > 0.4);
    assert.equal(periodScale(1150), 1.35);
    assert.ok(periodScale(1400) < 1.35);
    assert.equal(periodScale(2000), 0);
  });

  it('reveals the word from the period and pulls it back', () => {
    assert.equal(wordReveal(0), 0);
    assert.equal(wordReveal(1299), 0);
    assert.ok(wordReveal(1400) > 0 && wordReveal(1400) < 1);
    assert.ok(wordReveal(1400) > 0.5);
    assert.equal(wordReveal(1700), 1);
    assert.ok(wordReveal(1925) > 0 && wordReveal(1925) < 1);
    assert.equal(wordReveal(2000), 0);
  });

  it('returns seven numbers, including a neutral hidden frame', () => {
    const stimulus = createStimuli()[0]!;
    const hidden = sampleMotion(
      stimulus.delay,
      stimulus.angle,
      stimulus.spin,
      stimulus.drift,
      stimulus.spiral,
      stimulus.r0,
      stimulus.r1,
      0,
      390,
      844,
    );
    assert.deepEqual(hidden, [0, -1000, -1000, 0, 0, 1, 0]);
    const shown = sampleMotion(
      stimulus.delay,
      stimulus.angle,
      stimulus.spin,
      stimulus.drift,
      stimulus.spiral,
      stimulus.r0,
      stimulus.r1,
      400,
      390,
      844,
    );
    assert.equal(shown.length, 7);
    assert.equal(shown[0], 1);
  });

  it('marks every function a worklet calls as a worklet', () => {
    const timeline = readFileSync(new URL('./sluket.ts', import.meta.url), 'utf8');
    const play = readFileSync(new URL('../components/SluketPlay.tsx', import.meta.url), 'utf8');
    const defined = functionBodies(timeline);
    const worklets = new Set([...defined.entries()].filter(([, fn]) => fn.worklet).map(([name]) => name));
    for (const name of [
      'clamp01',
      'lerp',
      'bezier',
      'bezierSlope',
      'cubicBezierY',
      'springAt',
      'spiralAngle',
      'sampleMotion',
      'periodScale',
      'wordReveal',
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
    const uiBodies = [...callbackBodies(play, 'useAnimatedStyle'), ...callbackBodies(play, 'runOnUI')];
    assert.ok(uiBodies.length >= 4);
    for (const body of uiBodies) {
      for (const callee of callsIn(body)) {
        const target = defined.get(callee);
        if (!target) continue;
        assert.equal(target.worklet, true, `a splash worklet calls ${callee}, which is not a worklet`);
      }
    }
    assert.match(play, /opacity: motion\[0\]/);
    assert.match(play, /backgroundColor: interpolateColor\(motion\[6\], MIX_STOPS, colors\)/);
    assert.match(play, /translateX: motion\[1\][\s\S]*translateY: motion\[2\][\s\S]*rotate: `\$\{motion\[3\]\}rad`[\s\S]*scaleX: motion\[4\] \* motion\[5\][\s\S]*scaleY: motion\[4\]/);
    assert.equal(play.includes('rgbToHex'), false);
  });

  it('uses an ease-in for the spiral and an ease-out for the word', () => {
    assert.ok(cubicBezierY(0.55, 0, 1, 0.45, 0.5) < 0.5);
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
