import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createStimuli,
  cubicBezierY,
  NOISE_RGB,
  periodScale,
  sampleStimulus,
  spiralAngle,
  STIMULUS_COUNT,
  wordReveal,
  type Rgb,
} from './sluket.ts';

const LIGHT_HOLE: Rgb = [0x11, 0x11, 0x10];
const DARK_HOLE: Rgb = [0xf8, 0xf6, 0xf2];

describe('sluket', () => {
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

  it('uses an ease-in for the spiral and an ease-out for the word', () => {
    assert.ok(cubicBezierY(0.55, 0, 1, 0.45, 0.5) < 0.5);
    assert.ok(cubicBezierY(0.22, 1, 0.36, 1, 0.5) > 0.5);
  });
});
