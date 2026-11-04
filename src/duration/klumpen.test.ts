import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PRESET_MINUTES } from '../data/copy.ts';
import {
  CHOICE_HIT_MIN,
  CROSSFADE_MS,
  DURATION_ADJUST_HINT,
  DURATION_ADJUST_LABEL,
  DURATION_HOME_HINT,
  DURATION_SUBTITLE,
  DURATION_TITLE,
  DURATION_UNIT,
  FILL_MS,
  FLICK_VELOCITY,
  GRABBER_COLOR,
  GRABBER_HEIGHT,
  GRABBER_WIDTH,
  HINT_GAP,
  HOME_APPLY_DELAY,
  HOME_STONE_CENTER_Y,
  KLUMP_ASPECT,
  OUTLINE_COLOR,
  OUTLINE_WIDTH,
  ROLL_DISTANCE,
  ROLL_IN_DELAY,
  ROLL_IN_MS,
  ROLL_OUT_MS,
  ROW_HIT,
  ROW_PITCH,
  ROW_STROKE,
  ROW_WIDTHS,
  RUBBER_C,
  SHEET_RADIUS,
  SHEET_SECTION_GAP,
  SIZE_SPRING,
  STONE_COLOR,
  STONE_NUMBER_COLOR,
  SWIPE_ACTIVATION,
  SWIPE_STEP,
  VERTICAL_YIELD,
  chosenAnnouncement,
  dampingRatio,
  durationType,
  durationValueText,
  homeKlumpenLabel,
  indexFromSwipe,
  indexVelocity,
  klumpHeight,
  klumpWidth,
  minutesToIndex,
  overCoverage,
  overWeights,
  presetIndex,
  rollTravel,
  rowCenters,
  rowPitch,
  rubberBandIndex,
  selectionFromIndex,
  sheetBottomPadding,
  snapIndex,
  useButtonLabel,
} from './klumpen.ts';

describe('klumpen size', () => {
  it('grows by 40 pt through 120, 160, 200 and 240', () => {
    assert.deepEqual(
      [0, 1, 2, 3].map((index) => klumpWidth(index)),
      [120, 160, 200, 240],
    );
    assert.deepEqual(
      [120, 160, 200, 240].map((width) => Math.round(klumpHeight(width))),
      [101, 135, 169, 203],
    );
    assert.ok(Math.abs(KLUMP_ASPECT - 0.84553) < 0.0001);
  });

  it('maps the four durations onto those widths, and keeps a stored in-between length between them', () => {
    assert.deepEqual(PRESET_MINUTES.map((minutes) => minutesToIndex(minutes)), [0, 1, 2, 3]);
    assert.equal(klumpWidth(minutesToIndex(10)), 160);
    assert.equal(klumpWidth(minutesToIndex(15)), 200);
    assert.equal(minutesToIndex(12), 1.4);
    assert.equal(minutesToIndex(7), 0.4);
  });

  it('opens the sheet on Hjem’s value, snapping anything else to the nearest stop', () => {
    assert.equal(presetIndex(5), 0);
    assert.equal(presetIndex(10), 1);
    assert.equal(presetIndex(15), 2);
    assert.equal(presetIndex(20), 3);
    assert.equal(presetIndex(12), 1);
    assert.equal(presetIndex(13), 2);
    assert.equal(presetIndex(7), 0);
    assert.equal(presetIndex(Number.NaN), 1);
  });
});

describe('swipe', () => {
  it('moves one stop per 64 pt and rubber-bands past the ends', () => {
    assert.equal(SWIPE_STEP, 64);
    assert.equal(SWIPE_ACTIVATION, 8);
    assert.equal(VERTICAL_YIELD, 10);
    assert.equal(indexFromSwipe(1, 64), 2);
    assert.equal(indexFromSwipe(1, -64), 0);
    assert.equal(indexFromSwipe(1, 32), 1.5);
    const low = klumpWidth(indexFromSwipe(0, -800));
    const high = klumpWidth(indexFromSwipe(3, 800));
    assert.ok(low > 105 && low < 108, `low ${low}`);
    assert.ok(high > 252 && high < 255, `high ${high}`);
    assert.equal(selectionFromIndex(rubberBandIndex(-4)), 0);
    assert.equal(selectionFromIndex(rubberBandIndex(9)), 3);
    assert.equal(RUBBER_C, 0.55);
  });

  it('snaps to the nearest stop, and a flick adds at most one stop', () => {
    assert.equal(FLICK_VELOCITY, 600);
    assert.equal(snapIndex(1.2, 100), 1);
    assert.equal(snapIndex(1.2, 700), 2);
    assert.equal(snapIndex(1.6, 700), 2);
    assert.equal(snapIndex(1.6, -700), 1);
    assert.equal(snapIndex(1.2, -700), 1);
    assert.equal(snapIndex(0.2, -900), 0);
    assert.equal(snapIndex(2.8, 900), 3);
    assert.equal(snapIndex(2.8, -900), 2);
    assert.equal(snapIndex(0, 700), 1);
    assert.equal(snapIndex(3, -700), 2);
    assert.equal(snapIndex(1, -700), 0);
    assert.equal(indexVelocity(640), 10);
  });
});

describe('motion', () => {
  it('uses the critically damped size spring and the 120 ms home delay', () => {
    assert.deepEqual(SIZE_SPRING, { mass: 1, stiffness: 240, damping: 31 });
    assert.ok(Math.abs(dampingRatio(SIZE_SPRING) - 1) < 0.01);
    assert.equal(HOME_APPLY_DELAY, 120);
    assert.equal(FILL_MS, 160);
    assert.equal(CROSSFADE_MS, 160);
  });

  it('keeps the over-crossfade opaque in the middle', () => {
    assert.deepEqual(overWeights(0), { previous: 1, next: 0 });
    assert.deepEqual(overWeights(1), { previous: 0, next: 1 });
    const mid = overWeights(0.5);
    assert.ok(Math.abs(mid.previous - 0.875) < 1e-9);
    assert.ok(Math.abs(mid.next - 0.875) < 1e-9);
    assert.ok(overCoverage(0.5) >= 0.98);
  });

  it('rolls a larger number upward and a smaller number downward', () => {
    assert.equal(rollTravel(10, 15), -1);
    assert.equal(rollTravel(15, 10), 1);
    assert.equal(rollTravel(10, 10), 0);
    assert.equal(ROLL_OUT_MS, 120);
    assert.equal(ROLL_IN_MS, 200);
    assert.equal(ROLL_IN_DELAY, 60);
    assert.equal(ROLL_DISTANCE, 6);
  });
});

describe('type and copy', () => {
  it('scales the number with Large Title and locks it at 1.25', () => {
    const body = durationType(1);
    assert.equal(body.numberScale, 1);
    assert.equal(body.hideUnit, false);
    assert.equal(body.verticalChoices, false);
    const ax1 = durationType(28 / 17);
    assert.equal(ax1.numberScale, 1.25);
    assert.equal(ax1.hideUnit, false);
    assert.equal(ax1.verticalChoices, true);
    const ax2 = durationType(33 / 17);
    assert.equal(ax2.numberScale, 1.25);
    assert.equal(ax2.hideUnit, true);
    assert.equal(ax2.verticalChoices, true);
    assert.ok(durationType(19 / 17).numberScale > 1);
    assert.ok(durationType(19 / 17).numberScale < 1.25);
  });

  it('speaks one adjustable duration and a Bruk button', () => {
    assert.equal(DURATION_TITLE, 'Velg varighet');
    assert.equal(DURATION_SUBTITLE, 'Hvor lang tid har du i dag?');
    assert.equal(DURATION_HOME_HINT, 'Trykk for å velge en annen tid');
    assert.equal(DURATION_UNIT, 'min');
    assert.equal(DURATION_ADJUST_LABEL, 'Varighet');
    assert.equal(DURATION_ADJUST_HINT, 'Sveip opp eller ned for å endre');
    assert.equal(durationValueText(15), '15 minutter');
    assert.equal(useButtonLabel(15), 'Bruk 15 minutter');
    assert.equal(homeKlumpenLabel(15), '15 minutter. Trykk for å velge en annen tid');
    assert.equal(chosenAnnouncement(15), '15 minutter valgt');
    assert.equal(chosenAnnouncement(1), '1 minutt valgt');
  });
});

describe('sheet geometry', () => {
  it('matches the reference frame’s chrome, row and centers', () => {
    assert.equal(SHEET_RADIUS, 38);
    assert.equal(GRABBER_WIDTH, 36);
    assert.equal(GRABBER_HEIGHT, 5);
    assert.equal(GRABBER_COLOR, '#ADA9A2');
    assert.equal(OUTLINE_COLOR, '#CFC9BF');
    assert.equal(OUTLINE_WIDTH, 1);
    assert.equal(STONE_COLOR, '#111110');
    assert.equal(STONE_NUMBER_COLOR, '#F8F6F2');
    assert.deepEqual(ROW_WIDTHS, [22, 28, 34, 40]);
    assert.equal(ROW_PITCH, 79);
    assert.equal(ROW_HIT, 72);
    assert.ok(ROW_HIT >= CHOICE_HIT_MIN);
    assert.equal(CHOICE_HIT_MIN, 44);
    assert.equal(ROW_STROKE, 1.4);
    assert.equal(rowPitch(393), 79);
    assert.deepEqual(
      rowCenters(393).map((center) => Math.round(center)),
      [78, 157, 236, 315],
    );
    assert.ok(rowPitch(320) <= 76);
    assert.equal(sheetBottomPadding(34), 42);
    assert.equal(HOME_STONE_CENTER_Y, 348);
    assert.equal(HINT_GAP, 28);
    assert.equal(SHEET_SECTION_GAP, 18);
  });
});
