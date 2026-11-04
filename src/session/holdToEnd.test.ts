import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { HOLD_DONE_TEXT, HOLD_PHASE_TEXT, HOLD_TO_END_MS } from '../data/copy.ts';
import {
  HOLD,
  arcAlpha,
  contourGradient,
  easeInOutSine,
  easeOutCubic,
  glowLevel,
  mixHex,
  phaseEndMs,
  phaseIndex,
  sampleHold,
  springTargets,
  stepSpring,
  type HoldGesture,
  type SpringState,
} from './holdToEnd.ts';

const idle: HoldGesture = { pressAt: null, releaseAt: null, doneAt: null };
const plain = { reduceMotion: false, solid: false };

describe('hold to end', () => {
  it('keeps the phase boundaries as fractions of the one hold length', () => {
    assert.equal(HOLD_TO_END_MS, 4000);
    assert.equal(phaseEndMs(0), 1300);
    assert.equal(phaseEndMs(1), 2700);
    assert.equal(phaseEndMs(2), 4000);
    assert.equal(phaseIndex(0), 0);
    assert.equal(phaseIndex(1299), 0);
    assert.equal(phaseIndex(1300), 1);
    assert.equal(phaseIndex(2699), 1);
    assert.equal(phaseIndex(2700), 2);
  });

  it('steps the glow with ease-in-out sine and a small step at each phase', () => {
    assert.equal(glowLevel(0), 0);
    assert.ok(Math.abs(glowLevel(650) - 0.15) < 1e-12);
    assert.equal(glowLevel(1300), 0.3);
    assert.ok(Math.abs(glowLevel(2000) - (0.3 + 0.32 * easeInOutSine(700 / 1400))) < 1e-9);
    assert.equal(glowLevel(2700), 0.62);
    assert.equal(glowLevel(4000), 0.9);
    assert.ok(glowLevel(1300) - glowLevel(1299) > 0);
    assert.equal(HOLD_PHASE_TEXT[phaseIndex(1000)], 'Hold for å avslutte');
    assert.equal(HOLD_PHASE_TEXT[phaseIndex(2000)], 'Fortsett å holde …');
    assert.equal(HOLD_PHASE_TEXT[phaseIndex(3000)], 'Litt til …');
    assert.equal(HOLD_DONE_TEXT, 'Avsluttet');
  });

  it('grows the arc from the top and closes it at the end of the hold', () => {
    assert.equal(arcAlpha(0.2, 0), 0);
    assert.equal(arcAlpha(0, 0.5), 0);
    assert.equal(arcAlpha(0.02, 0.5), 1);
    assert.ok(arcAlpha(0.49, 0.5) > 0.2 && arcAlpha(0.49, 0.5) < 1);
    assert.equal(arcAlpha(0.6, 0.5), 0);
    assert.equal(arcAlpha(0, 1), 1);
    const stops = contourGradient(0.5, '#F6EBD6', 1, true);
    for (let i = 1; i < stops.positions.length; i += 1) {
      assert.ok(stops.positions[i] > stops.positions[i - 1]);
    }
    assert.equal(stops.positions[0], 0);
    assert.equal(stops.positions[stops.positions.length - 1], 1);
    assert.equal(contourGradient(0.5, '#F6EBD6', 0.4, false).colors[0], 'rgba(246,235,214,0.4)');
  });

  it('lights north before east when the sweep starts at 12 o’clock', () => {
    // Angle 0 is north. The first 0.6% is the soft start, so the lit sample sits just clockwise of it.
    assert.equal(arcAlpha(0.02, 0.1), 1);
    assert.equal(arcAlpha(0.25, 0.1), 0);
    // NNE is 22.5°. East is a quarter turn, so at 30% the arc has already passed it.
    assert.equal(arcAlpha(0.0625, 0.3), 1);
    assert.equal(arcAlpha(0.25, 0.3), 1);
  });

  it('falls the light and the arc back over 300 ms and leaves the copy alone until 120 ms', () => {
    const g: HoldGesture = { pressAt: 0, releaseAt: 2400, doneAt: null };
    const atRelease = sampleHold(g, 2400, plain);
    const halfway = sampleHold(g, 2550, plain);
    const gone = sampleHold(g, 2700, plain);
    const k = 1 - easeOutCubic(0.5);
    assert.ok(Math.abs(halfway.e - atRelease.e * k) < 1e-9);
    assert.ok(Math.abs(halfway.prog - 0.6 * k) < 1e-9);
    assert.ok(gone.e < 1e-9);
    assert.equal(gone.prog, 0);
    assert.equal(sampleHold(g, 2519, plain).textCur, 1);
    assert.equal(sampleHold(g, 2520, plain).textCur, 0);
    assert.equal(sampleHold(g, 2400, plain).glowAlpha > 0, true);
  });

  it('peaks the confirmation and then fades the screen toward reflection', () => {
    const g: HoldGesture = { pressAt: 0, releaseAt: null, doneAt: 4000 };
    const peak = sampleHold(g, 4140, plain);
    const settled = sampleHold(g, 4600, plain);
    const beforeFade = sampleHold(g, 4650, plain);
    const midFade = sampleHold(g, 4800, plain);
    const gone = sampleHold(g, 4950, plain);
    assert.ok(Math.abs(peak.e - 1) < 1e-9);
    assert.ok(Math.abs(peak.glowR - HOLD.glowRPeak) < 1e-9);
    assert.equal(peak.textCur, 3);
    assert.equal(peak.fade, 0);
    assert.ok(Math.abs(settled.e - 0.9) < 1e-9);
    assert.ok(Math.abs(settled.glowR - HOLD.glowRFull) < 1e-9);
    assert.equal(beforeFade.fade, 0);
    assert.ok(Math.abs(midFade.fade - easeInOutSine(0.5)) < 1e-9);
    assert.ok(Math.abs(gone.fade - 1) < 1e-9);
    assert.equal(sampleHold(g, 4000, plain).textXf, 0);
    assert.equal(sampleHold(g, 4180, plain).textXf, 1);
  });

  it('crossfades copy and keeps Reduce Motion to opacity, without a radius pulse', () => {
    const holding: HoldGesture = { pressAt: 0, releaseAt: null, doneAt: null };
    const atBoundary = sampleHold(holding, 1300, plain);
    assert.equal(atBoundary.textCur, 1);
    assert.equal(atBoundary.textPrev, 0);
    assert.equal(atBoundary.textXf, 0);
    assert.ok(Math.abs(sampleHold(holding, 1390, plain).textXf - easeInOutSine(0.5)) < 1e-9);
    const done: HoldGesture = { pressAt: 0, releaseAt: null, doneAt: 4000 };
    const reduced = sampleHold(done, 4140, { reduceMotion: true, solid: false });
    assert.equal(reduced.arc, 0);
    assert.equal(reduced.glowR, HOLD.glowRFull);
    assert.ok(Math.abs(reduced.e - 1) < 1e-9);
    assert.equal(reduced.pressed, 0);
    const mid = sampleHold(holding, 2000, { reduceMotion: true, solid: true });
    assert.equal(mid.arc, 0);
    assert.equal(mid.glowAlpha, 0);
    assert.equal(mid.solid, 1);
    assert.equal(mid.pressed, 0);
  });

  it('squashes on contact and springs back with an overshoot', () => {
    const atContact = springTargets(0, 0);
    assert.equal(atContact.sq, HOLD.squashPress);
    assert.equal(atContact.size, HOLD.sizePress);
    assert.equal(atContact.wob, 0);
    let state: SpringState = { sq: 0.04, sqV: 0, wob: 0, wobV: 0, size: 0, sizeV: 0 };
    let lowest = state.sq;
    for (let ms = 0; ms < 800; ms += 1) {
      state = stepSpring(state, { sq: 0, wob: 0, size: 0 }, 0.001);
      if (state.sq < lowest) lowest = state.sq;
    }
    assert.ok(lowest < 0);
    assert.ok(Math.abs(state.sq) < 0.002);
    const g: HoldGesture = { pressAt: 0, releaseAt: null, doneAt: null };
    assert.equal(sampleHold(g, 0, plain).pressed, 0);
    assert.ok(Math.abs(sampleHold(g, 150, plain).pressed - HOLD.pressedMix) < 1e-9);
  });

  it('mixes the track into the core the way variant A does', () => {
    assert.equal(mixHex('#66635D', '#F6EBD6', 0), '#66635d');
    assert.equal(mixHex('#66635D', '#F6EBD6', 1), '#f6ebd6');
    const full = sampleHold({ pressAt: 0, releaseAt: null, doneAt: null }, 4000, plain);
    assert.ok(Math.abs(full.e - 0.9) < 1e-9);
    assert.ok(Math.abs(full.strokeW - HOLD.litWMax) < 1e-9);
    assert.ok(Math.abs(full.glowR - HOLD.glowRFull) < 1e-9);
    assert.equal(full.litMix, 1);
    assert.equal(sampleHold(idle, 0, plain).textCur, 0);
    assert.equal(sampleHold(idle, 0, plain).litAlpha, 0);
  });
});
