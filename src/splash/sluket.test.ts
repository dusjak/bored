import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { S6_DOT_W, S6_DOT_X, S6_DOT_Y, S6_WORD_LEFT, S6_WORD_RIGHT } from './s6.ts';
import { CRASH_REST_AT, SPLASH_BG as PLATE, SPLASH_INK as INK } from './splashTiming.ts';
import {
  CALM,
  colorMixEnabled,
  createStimuli,
  GLIDE_AT,
  GLIDE_MS,
  gooSigma,
  INK_RGB,
  KLUMP0,
  KLUMP1,
  klumpWidth,
  logoPose,
  LOW_POWER_COUNT,
  MEGA_MS,
  megaPhase,
  massIn,
  MERGE,
  mixAt,
  MIX_CELL_LOW_PT,
  MIX_CELL_PT,
  mixCellPt,
  MIX_OFF_AT,
  mixShaderUnits,
  modelTime,
  phaseName,
  REST_AT,
  REVEAL_AT,
  sampleStimulus,
  SAT,
  SHAPE_VAR,
  SIZE_K,
  SPLASH_BG,
  SPLASH_INK,
  SPLASH_MS,
  STIMULUS_COUNT,
  WORDMARK_EXIT_MS,
  wordmarkExitPose,
  stimulusLimit,
  SWIRL_K,
  SWIRL_MS,
  TURNS,
  WOBBLE,
  writeOutline,
} from './sluket.ts';

const PHONE = { width: 393, height: 852 };

describe('sluket v5 preset C', () => {
  it('is always dark and does not read the theme', () => {
    assert.equal(SPLASH_BG, '#111110');
    assert.equal(SPLASH_INK, '#F8F6F2');
    assert.equal(SPLASH_BG, PLATE);
    assert.equal(SPLASH_INK, INK);
    for (const file of [
      'sluket.ts',
      'sluketDraw.ts',
      '../components/SluketPlay.tsx',
      '../components/StillSplash.tsx',
      '../components/S6Mark.tsx',
      '../components/WordmarkImage.tsx',
      '../components/SluketSplash.tsx',
      '../components/PustPlay.tsx',
      '../components/usePlateExit.ts',
      'pust.ts',
    ]) {
      const source = readFileSync(new URL(file, import.meta.url), 'utf8');
      assert.equal(source.includes('useTheme'), false, file);
      assert.equal(source.includes('useColorScheme'), false, file);
      assert.equal(source.includes('splash-wordmark-light'), false, file);
    }
  });

  it('uses preset C: 130 pebbles, largest first, same seeds every time', () => {
    const stimuli = createStimuli();
    assert.equal(stimuli.length, STIMULUS_COUNT);
    assert.equal(STIMULUS_COUNT, 130);
    assert.deepEqual(createStimuli(), stimuli);
    assert.equal(stimuli.filter((item) => item.rgb[0] === 0xff && item.rgb[1] === 0x3b).length, 17);
    assert.equal(SIZE_K, 0.9);
    assert.equal(SHAPE_VAR, 0.85);
    assert.equal(SAT, 1);
    assert.equal(WOBBLE, 1.4);
    assert.equal(MERGE, 1);
    assert.equal(TURNS, 1.75);
    assert.equal(SWIRL_K, 1.8);
    assert.equal(KLUMP0, 0);
    assert.equal(KLUMP1, 52);
    assert.equal(CALM, 0.85);
    for (let i = 0; i < stimuli.length; i += 1) {
      const item = stimuli[i]!;
      assert.ok(item.size >= 24 * SIZE_K - 1e-6 && item.size <= 490 * SIZE_K + 1e-6);
      assert.ok(item.r0 >= 0.15 && item.r0 <= 0.75);
      assert.ok(item.turnU >= 0.8 && item.turnU <= 1);
      assert.ok(item.delay >= 0 && item.delay <= 160);
      assert.equal(item.outline.length, 28);
      if (i > 0) assert.ok(item.delay >= stimuli[i - 1]!.delay);
      let x0 = 1e9;
      let x1 = -1e9;
      let y0 = 1e9;
      let y1 = -1e9;
      for (const p of item.outline) {
        x0 = Math.min(x0, p[0]);
        x1 = Math.max(x1, p[0]);
        y0 = Math.min(y0, p[1]);
        y1 = Math.max(y1, p[1]);
      }
      assert.ok(Math.abs(Math.max(x1 - x0, y1 - y0) - 1) < 1e-6);
    }
    assert.equal(stimuli[0]!.delay, 0);
  });

  it('matches the preset C clock: 2100 ms swirl, rest at 3000, done at 3300', () => {
    assert.equal(SWIRL_MS, 2100);
    assert.equal(GLIDE_AT, 2350);
    assert.equal(REVEAL_AT, 2550);
    assert.equal(REST_AT, 3000);
    assert.equal(SPLASH_MS, 3300);
    assert.equal(MIX_OFF_AT, 2350);
    assert.equal(modelTime(0), 120);
    assert.equal(modelTime(SWIRL_MS), 1250);
    const halfway = modelTime(SWIRL_MS / 2);
    const linear = 120 + 0.5 * 1130;
    assert.ok(halfway < linear, `swirlK holds the colours, got ${halfway}`);
    assert.equal(phaseName(0), 'arrive');
    assert.equal(phaseName(GLIDE_AT - 1), 'settle');
    assert.equal(phaseName(GLIDE_AT + 1), 'glide');
    assert.equal(phaseName(REVEAL_AT + 1), 'reveal');
    assert.equal(phaseName(REST_AT + 1), 'rest');
    assert.equal(phaseName(SPLASH_MS), 'done');
    assert.equal(WORDMARK_EXIT_MS, 150);
    assert.equal(MEGA_MS, 3450);
    assert.equal(CRASH_REST_AT, WORDMARK_EXIT_MS + REST_AT);
    assert.equal(megaPhase(0), 'wordmark');
    assert.equal(megaPhase(WORDMARK_EXIT_MS - 1), 'wordmark');
    assert.equal(megaPhase(WORDMARK_EXIT_MS), 'arrive');
    assert.equal(megaPhase(WORDMARK_EXIT_MS + REST_AT), 'rest');
    assert.equal(megaPhase(MEGA_MS), 'done');
  });

  it('draws the native wordmark into the dot before preset C starts empty', () => {
    const rest = logoPose(REST_AT, 1, INK_RGB);
    const opened = wordmarkExitPose(0);
    assert.deepEqual(opened, rest);
    assert.equal(opened.opacity, 1);
    assert.equal(opened.kw, S6_DOT_W);
    const mid = wordmarkExitPose(WORDMARK_EXIT_MS / 2);
    assert.ok(mid.kw < opened.kw);
    assert.ok(mid.kw > 0);
    assert.ok(mid.front > opened.front);
    assert.equal(mid.dx, S6_DOT_X);
    assert.equal(mid.dy, S6_DOT_Y);
    const gone = wordmarkExitPose(WORDMARK_EXIT_MS);
    assert.equal(gone.kw, 0);
    assert.equal(gone.opacity, 0);
    assert.ok(gone.clipLeft >= gone.clipRight - 0.001);
    assert.equal(logoPose(0, 0, INK_RGB).kw, 0);
  });

  it('ramps the paint mix from full to 0.4 and keeps it on in Low Power Mode', () => {
    const start = mixAt(0);
    assert.ok(Math.abs(start.m - 1) < 1e-9);
    assert.ok(Math.abs(start.radius - 20) < 1e-9);
    const end = mixAt(SWIRL_MS);
    assert.ok(Math.abs(end.m - 0.4) < 1e-9);
    assert.ok(Math.abs(end.radius - 40) < 1e-9);
    const mid = mixAt(0.4 * SWIRL_MS);
    const e = 0.5 ** 1.2;
    assert.ok(Math.abs(mid.m - (1 + (0.4 - 1) * e)) < 1e-9);
    assert.ok(Math.abs(mid.radius - (20 + (40 - 20) * e)) < 1e-9);
    assert.equal(colorMixEnabled(true), true);
    assert.equal(colorMixEnabled(false), false);
    assert.equal(mixCellPt(false), MIX_CELL_PT);
    assert.equal(MIX_CELL_PT, 4);
    assert.equal(mixCellPt(true), MIX_CELL_LOW_PT);
    assert.equal(MIX_CELL_LOW_PT, 8);
    assert.equal(stimulusLimit(false), STIMULUS_COUNT);
    assert.equal(stimulusLimit(true), LOW_POWER_COUNT);
    assert.equal(LOW_POWER_COUNT, 80);
    assert.equal(mixShaderUnits(20, 4), 5);
    assert.equal(mixShaderUnits(40, 8), 5);
    assert.equal(gooSigma(200), 4);
    assert.equal(gooSigma(1250), 0);
    assert.ok(gooSigma(1175) < gooSigma(1100));
  });

  it('starts empty, hides the tail in Low Power Mode, and swallows every pebble by the glide', () => {
    const stimuli = createStimuli();
    const first = stimuli[0]!;
    const before = sampleStimulus(
      0,
      first.delay,
      first.angle,
      first.r0,
      first.size,
      first.rot0,
      first.flake,
      first.turnU,
      first.shift,
      modelTime(0),
      PHONE.width,
      PHONE.height,
      STIMULUS_COUNT,
      5,
      0,
    );
    assert.equal(before[8], 0);
    assert.equal(klumpWidth(0), 0);
    const tail = stimuli[LOW_POWER_COUNT]!;
    const hidden = sampleStimulus(
      LOW_POWER_COUNT,
      tail.delay,
      tail.angle,
      tail.r0,
      tail.size,
      tail.rot0,
      tail.flake,
      tail.turnU,
      tail.shift,
      modelTime(800),
      PHONE.width,
      PHONE.height,
      LOW_POWER_COUNT,
      5,
      0,
    );
    assert.equal(hidden[0], 0);
    const done = massIn(stimuli, SWIRL_MS, PHONE.width, PHONE.height, STIMULUS_COUNT);
    assert.equal(done.fraction, 1);
    const early = massIn(stimuli, 0, PHONE.width, PHONE.height, STIMULUS_COUNT);
    assert.equal(early.fraction, 0);
  });

  it('rests on the S6 period, not the screen centre, and that frame is the static mark', () => {
    const early = logoPose(1000, 0.2, INK_RGB);
    assert.equal(early.dx, 0);
    assert.equal(early.dy, 0);
    assert.equal(early.settled, 0);
    const rest = logoPose(REST_AT, 1, [10, 20, 30]);
    const end = logoPose(SPLASH_MS, 1, [10, 20, 30]);
    assert.equal(rest.dx, S6_DOT_X);
    assert.equal(rest.dy, S6_DOT_Y);
    assert.equal(rest.kw, S6_DOT_W);
    assert.notEqual(rest.dx, 0);
    assert.equal(rest.settled, 1);
    assert.equal(rest.opacity, 1);
    assert.deepEqual([rest.r, rest.g, rest.b], [...INK_RGB]);
    assert.deepEqual(rest, end);
    assert.ok(rest.clipLeft <= S6_WORD_LEFT);
    assert.ok(rest.clipRight >= S6_WORD_RIGHT);
    const gliding = logoPose(GLIDE_AT + GLIDE_MS, 1, INK_RGB);
    assert.equal(gliding.dx, S6_DOT_X);
    assert.equal(gliding.dy, S6_DOT_Y);
    assert.equal(gliding.kw, S6_DOT_W);
    const overMix = logoPose(1700, 0.2, INK_RGB, true);
    const noMix = logoPose(1700, 0.2, INK_RGB, false);
    assert.ok(overMix.kw > 1);
    assert.equal(overMix.opacity, 0);
    assert.equal(noMix.opacity, 1);
    assert.equal(logoPose(REST_AT, 1, INK_RGB, true).opacity, 1);
  });

  it('builds every pebble from 28 quadratics', () => {
    const outline = createStimuli()[0]!.outline;
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
      outline,
      0.3,
      1,
    );
    assert.equal(quads, 28);
    assert.equal(closed, true);
  });

  it('draws the swallow on the JS thread, on a coarse grid, from its own clock', () => {
    const play = readFileSync(new URL('../components/SluketPlay.tsx', import.meta.url), 'utf8');
    const draw = readFileSync(new URL('./sluketDraw.ts', import.meta.url), 'utf8');
    const mark = readFileSync(new URL('../components/S6Mark.tsx', import.meta.url), 'utf8');
    assert.equal(play.includes('MEGA_MS'), true);
    assert.equal(play.includes('wordmarkExitPose'), true);
    assert.equal(play.includes('WORDMARK_EXIT_MS'), true);
    assert.equal(play.includes('timeSinceFirstFrame'), false);
    assert.equal(play.includes('usePathValue'), false);
    assert.equal(play.includes('useFrameCallback'), false);
    assert.equal(play.includes("'worklet'"), false);
    assert.equal(play.includes('requestAnimationFrame'), true);
    assert.equal(play.includes('presentSplash'), true);
    assert.equal(play.includes('BlobView'), false);
    assert.equal(play.includes('WordmarkImage'), false);
    assert.equal(play.includes('renderBlobs'), true);
    assert.equal(play.includes('onFirstPaint'), true);
    assert.equal(draw.includes('Surface.Make'), true);
    assert.equal(draw.includes('MakeOffscreen'), false);
    assert.equal(functionBodies(draw).get('rasterSurface')?.body.includes('Surface.Make'), true);
    assert.equal(draw.includes('mixShaderUnits'), true);
    assert.equal(functionBodies(draw).get('presentSplash')?.worklet, false);
    assert.equal(functionBodies(draw).get('renderBlobs')?.worklet, true);
    assert.equal(mark.includes('SplashLogo'), true);
    assert.equal(mark.includes('STATIC_LOGO'), true);
    assert.equal(play.includes('<Text'), false);
  });

  it('marks every function a worklet calls as a worklet', () => {
    const timeline = readFileSync(new URL('./sluket.ts', import.meta.url), 'utf8');
    const draw = readFileSync(new URL('./sluketDraw.ts', import.meta.url), 'utf8');
    const breathe = readFileSync(new URL('./pust.ts', import.meta.url), 'utf8');
    const play = readFileSync(new URL('../components/SluketPlay.tsx', import.meta.url), 'utf8');
    const pustPlay = readFileSync(new URL('../components/PustPlay.tsx', import.meta.url), 'utf8');
    const defined = new Map([...functionBodies(timeline), ...functionBodies(draw), ...functionBodies(breathe)]);
    for (const name of [
      'modelTime',
      'mixAt',
      'sampleStimulus',
      'massIn',
      'logoPose',
      'wordmarkExitPose',
      'gooSigma',
      'writeOutline',
      'renderBlobs',
      'pustPose',
      'pustScale',
      'easeInOutSine',
    ]) {
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
      ...callbackBodies(play, 'useFrameCallback'),
      ...callbackBodies(pustPlay, 'useCallback'),
      ...callbackBodies(pustPlay, 'useFrameCallback'),
    ];
    assert.ok(uiBodies.length >= 4);
    for (const body of uiBodies) {
      for (const callee of callsIn(body)) {
        const target = defined.get(callee);
        if (!target) continue;
        assert.equal(target.worklet, true, `a splash worklet calls ${callee}, which is not a worklet`);
      }
    }
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
