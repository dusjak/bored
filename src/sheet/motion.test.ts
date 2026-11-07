import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  SHEET_BACKDROP_MAX,
  SHEET_CLOSE_BEZIER,
  SHEET_CLOSE_MS,
  SHEET_DISMISS_FRACTION,
  SHEET_DISMISS_VELOCITY,
  SHEET_CONTENT_TOP,
  SHEET_DRAG_ZONE,
  sheetContentPullUp,
  SHEET_GRABBER,
  SHEET_GRABBER_HEIGHT,
  SHEET_GRABBER_TOP,
  SHEET_GRABBER_WIDTH,
  SHEET_HIT_MIN,
  SHEET_OPEN_BEZIER,
  SHEET_OPEN_MS,
  SHEET_REDUCE_IN_MS,
  SHEET_REDUCE_OUT_MS,
  SHEET_SPRING,
  SHEET_SWIPE_CLOSE_BEZIER,
  SHEET_SWIPE_CLOSE_MS,
  backdropOpacityForTranslate,
  fingerToTranslate,
  rubberBandOffset,
  shouldDismissSheet,
  translateToFinger,
} from './motion.ts';

const EXAMPLE_HEIGHT = 620;

describe('sheet motion', () => {
  it('uses the open and close timings from the proposal', () => {
    assert.deepEqual(SHEET_OPEN_BEZIER, [0.32, 0.72, 0, 1]);
    assert.equal(SHEET_OPEN_MS, 520);
    assert.deepEqual(SHEET_CLOSE_BEZIER, [0.32, 0, 0.67, 0]);
    assert.equal(SHEET_CLOSE_MS, 360);
    assert.deepEqual(SHEET_SWIPE_CLOSE_BEZIER, [0.2, 0.6, 0.5, 1]);
    assert.equal(SHEET_SWIPE_CLOSE_MS, 280);
    assert.equal(SHEET_REDUCE_IN_MS, 200);
    assert.equal(SHEET_REDUCE_OUT_MS, 160);
  });

  it('springs critically damped, with the finger velocity left for the caller', () => {
    assert.equal(SHEET_SPRING.mass, 1);
    assert.equal(SHEET_SPRING.stiffness, 130.5);
    assert.equal(SHEET_SPRING.damping, 22.85);
    const ratio = SHEET_SPRING.damping / (2 * Math.sqrt(SHEET_SPRING.stiffness * SHEET_SPRING.mass));
    assert.ok(Math.abs(ratio - 1) < 0.001);
  });

  it('rubber-bands upward with Apple’s coefficient', () => {
    const stretched = rubberBandOffset(80, EXAMPLE_HEIGHT);
    assert.ok(Math.abs(stretched - 41.08) < 0.05);
    assert.equal(fingerToTranslate(110, EXAMPLE_HEIGHT), 110);
    assert.equal(fingerToTranslate(900, EXAMPLE_HEIGHT), 900);
    assert.equal(fingerToTranslate(0, EXAMPLE_HEIGHT), 0);
    assert.ok(Math.abs(fingerToTranslate(-80, EXAMPLE_HEIGHT) + 41.08) < 0.05);
  });

  it('round-trips a stretch so a second grab does not jump', () => {
    for (const finger of [0, -40, -80, -200]) {
      const visual = fingerToTranslate(finger, EXAMPLE_HEIGHT);
      const back = translateToFinger(visual, EXAMPLE_HEIGHT);
      assert.ok(Math.abs(back - finger) < 0.05, `${finger} came back as ${back}`);
    }
  });

  it('closes past 30% of the sheet or faster than 800pt/s down', () => {
    const edge = EXAMPLE_HEIGHT * SHEET_DISMISS_FRACTION;
    assert.equal(edge, 186);
    assert.equal(SHEET_DISMISS_VELOCITY, 800);
    assert.equal(shouldDismissSheet(edge, EXAMPLE_HEIGHT, 0), false);
    assert.equal(shouldDismissSheet(edge + 0.1, EXAMPLE_HEIGHT, 0), true);
    assert.equal(shouldDismissSheet(110, EXAMPLE_HEIGHT, 100), false);
    assert.equal(shouldDismissSheet(0, EXAMPLE_HEIGHT, 800), false);
    assert.equal(shouldDismissSheet(0, EXAMPLE_HEIGHT, 800.1), true);
    assert.equal(shouldDismissSheet(10, EXAMPLE_HEIGHT, 1100), true);
    assert.equal(shouldDismissSheet(-40, EXAMPLE_HEIGHT, 0), false);
    assert.equal(shouldDismissSheet(100, 0, 0), false);
    assert.equal(shouldDismissSheet(0, 0, 900), true);
  });

  it('dims #111110 from 0 to 0.40 in step with the sheet', () => {
    assert.equal(SHEET_BACKDROP_MAX, 0.4);
    assert.equal(backdropOpacityForTranslate(0, EXAMPLE_HEIGHT), 0.4);
    assert.equal(backdropOpacityForTranslate(EXAMPLE_HEIGHT, EXAMPLE_HEIGHT), 0);
    assert.ok(Math.abs(backdropOpacityForTranslate(EXAMPLE_HEIGHT / 2, EXAMPLE_HEIGHT) - 0.2) < 1e-9);
    assert.equal(backdropOpacityForTranslate(-41, EXAMPLE_HEIGHT), 0.4);
    assert.equal(backdropOpacityForTranslate(900, EXAMPLE_HEIGHT), 0);
  });

  it('keeps the HIG grabber and a 56pt drag band', () => {
    assert.equal(SHEET_GRABBER, '#ADA9A2');
    assert.equal(SHEET_GRABBER_WIDTH, 36);
    assert.equal(SHEET_GRABBER_HEIGHT, 5);
    assert.equal(SHEET_GRABBER_TOP, 5);
    assert.equal(SHEET_HIT_MIN, 44);
    assert.equal(SHEET_DRAG_ZONE, 56);
    assert.equal(SHEET_CONTENT_TOP, 24);
    assert.equal(sheetContentPullUp(), 24 - 56);
  });
});
