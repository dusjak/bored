import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { SPLASH_BG as PLATE, SPLASH_INK as INK } from './splashTiming.ts';
import {
  colorMixEnabled,
  createStimuli,
  GLIDE_AT,
  GLIDE_MS,
  gooSigma,
  legacyTime,
  LOW_POWER_COUNT,
  markPose,
  MAX_TURNS,
  mixAt,
  NOISE_HEX,
  phaseName,
  REST_AT,
  REVEAL_AT,
  sampleStimulus,
  SPLASH_BG,
  SPLASH_INK,
  SPLASH_MS,
  STIMULUS_COUNT,
  SWIRL_MS,
  WOBBLE_SCALE,
  writeOutline,
} from './sluket.ts';

describe('sluket v4', () => {
  it('is always dark and does not read the theme', () => {
    assert.equal(SPLASH_BG, '#111110');
    assert.equal(SPLASH_INK, '#F8F6F2');
    assert.equal(SPLASH_BG, PLATE);
    assert.equal(SPLASH_INK, INK);
    for (const file of ['sluket.ts', '../components/SluketPlay.tsx', '../components/StillSplash.tsx', '../components/WordmarkImage.tsx', '../components/SluketSplash.tsx']) {
      const source = readFileSync(new URL(file, import.meta.url), 'utf8');
      assert.equal(source.includes('useTheme'), false, file);
      assert.equal(source.includes('useColorScheme'), false, file);
      assert.equal(source.includes('splash-wordmark-light'), false, file);
    }
  });

  it('builds 160 shapes, largest first, with the v4 seed', () => {
    const stimuli = createStimuli();
    assert.equal(stimuli.length, STIMULUS_COUNT);
    assert.deepEqual(createStimuli(), stimuli);
    assert.equal(stimuli.filter((item) => item.hex === '#FF3B30').length, STIMULUS_COUNT / NOISE_HEX.length);
    assert.equal(stimuli.filter((item) => item.kind === 0).length, 80);
    assert.equal(stimuli.filter((item) => item.kind === 1).length, 48);
    assert.equal(stimuli.filter((item) => item.kind === 2).length, 32);
    for (let i = 0; i < stimuli.length; i += 1) {
      const item = stimuli[i]!;
      assert.ok(item.size >= 24 && item.size <= 490);
      assert.ok(item.r0 >= 0.15 && item.r0 <= 0.75);
      assert.ok(item.turnU >= 0.8 && item.turnU <= 1);
      assert.ok(item.delay >= 0 && item.delay <= 160);
      if (i > 0) assert.ok(item.delay >= stimuli[i - 1]!.delay);
    }
    assert.equal(stimuli[0]!.delay, 0);
  });

  it('stretches the shape timeline across the 4770 ms swirl', () => {
    assert.equal(SWIRL_MS, 4770);
    assert.equal(GLIDE_AT, 5020);
    assert.equal(REVEAL_AT, 5200);
    assert.equal(REST_AT, 5700);
    assert.equal(SPLASH_MS, 6000);
    assert.equal(legacyTime(0), 120);
    assert.ok(Math.abs(legacyTime(1098) - 380) < 1.5);
    assert.ok(Math.abs(legacyTime(2870) - 800) < 1.5);
    assert.ok(Math.abs(legacyTime(4137) - 1100) < 1.5);
    assert.equal(legacyTime(4770), 1250);
    assert.equal(phaseName(0), 'flood');
    assert.equal(phaseName(1097), 'flood');
    assert.equal(phaseName(2000), 'swirl');
    assert.equal(phaseName(3000), 'tighten');
    assert.equal(phaseName(4500), 'swallow');
    assert.equal(phaseName(4900), 'settle');
    assert.equal(phaseName(5100), 'glide');
    assert.equal(phaseName(5400), 'reveal');
    assert.equal(phaseName(5800), 'rest');
    assert.equal(phaseName(6000), 'done');
  });

  it('matches the paint-mix table', () => {
    const start = mixAt(0);
    assert.ok(Math.abs(start.m - 0.85) < 1e-9);
    assert.ok(Math.abs(start.radius - 13) < 1e-9);
    const edge = mixAt(0.25 * SWIRL_MS);
    assert.ok(Math.abs(edge.m - 0.85) < 1e-9);
    assert.ok(Math.abs(edge.radius - 13) < 1e-9);
    const rows: [number, number, number][] = [
      [2385, 0.82, 14],
      [2862, 0.76, 16],
      [3339, 0.66, 19],
      [3816, 0.5, 24],
      [4293, 0.27, 31],
      [4722, 0, 40],
    ];
    for (const [t, m, radius] of rows) {
      const value = mixAt(t);
      assert.ok(Math.abs(value.m - m) < 0.02, `${t} m ${value.m}`);
      assert.ok(Math.abs(value.radius - radius) < 1, `${t} r ${value.radius}`);
    }
    assert.equal(colorMixEnabled(true, false), true);
    assert.equal(colorMixEnabled(true, true), false);
    assert.equal(colorMixEnabled(false, false), false);
  });

  it('hides shapes until the flood and drops the tail in Low Power Mode', () => {
    const stimuli = createStimuli();
    const first = stimuli[0]!;
    const before = sampleStimulus(0, first.delay, first.angle, first.r0, first.size, first.phase, first.rot0, first.flake, first.turnU, first.shift, legacyTime(0), 402, 874, 0);
    assert.equal(before[8], 0);
    const mid = sampleStimulus(0, first.delay, first.angle, first.r0, first.size, first.phase, first.rot0, first.flake, first.turnU, first.shift, legacyTime(2000), 402, 874, 0);
    assert.equal(mid[0], 1);
    const tail = stimuli[LOW_POWER_COUNT]!;
    const hidden = sampleStimulus(LOW_POWER_COUNT, tail.delay, tail.angle, tail.r0, tail.size, tail.phase, tail.rot0, tail.flake, tail.turnU, tail.shift, legacyTime(2000), 402, 874, 1);
    assert.equal(hidden[0], 0);
    assert.equal(MAX_TURNS, 2.5);
    assert.equal(WOBBLE_SCALE, 1.6);
    assert.ok(gooSigma(200) <= 2.01);
    assert.ok(gooSigma(legacyTime(3500)) <= 6.01);
  });

  it('rests on the static wordmark and glides the dot before the word reveals', () => {
    const early = markPose(1000, 0.2);
    assert.equal(early.showPng, false);
    assert.equal(early.dx, 0);
    const gliding = markPose(GLIDE_AT + GLIDE_MS, 1);
    assert.ok(Math.abs(gliding.dx - 62.24) < 0.05);
    assert.ok(Math.abs(gliding.dy - 0.31) < 0.05);
    const rest = markPose(5800, 1);
    assert.equal(rest.showPng, true);
    assert.equal(rest.showCircle, false);
    assert.equal(rest.glyphA, 0);
  });

  it('builds every blob from 28 quadratics', () => {
    for (const kind of [0, 1, 2]) {
      let quads = 0;
      let closed = false;
      writeOutline(
        {
          moveTo() {},
          quadTo() {
            quads += 1;
          },
          close() {
            closed = true;
          },
        },
        kind,
        0.256,
        1,
      );
      assert.equal(quads, 28);
      assert.equal(closed, true);
    }
  });

  it('marks every function a worklet calls as a worklet', () => {
    const timeline = readFileSync(new URL('./sluket.ts', import.meta.url), 'utf8');
    const play = readFileSync(new URL('../components/SluketPlay.tsx', import.meta.url), 'utf8');
    const defined = functionBodies(timeline);
    for (const name of ['legacyTime', 'mixAt', 'sampleStimulus', 'massIn', 'markPose', 'gooSigma', 'writeOutline']) {
      assert.equal(defined.get(name)?.worklet, true, name);
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
      ...callbackBodies(play, 'useCallback'),
      ...callbackBodies(play, 'useDerivedValue'),
      ...callbackBodies(play, 'useAnimatedStyle'),
      ...callbackBodies(play, 'useAnimatedReaction'),
      ...callbackBodies(play, 'usePathValue'),
    ];
    assert.ok(uiBodies.length >= 4);
    for (const body of uiBodies) {
      for (const callee of callsIn(body)) {
        const target = defined.get(callee);
        if (!target) continue;
        assert.equal(target.worklet, true, `a splash worklet calls ${callee}, which is not a worklet`);
      }
    }
    assert.equal(play.includes('useTheme'), false);
    assert.equal(play.includes('<Text'), false);
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
