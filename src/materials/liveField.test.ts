import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { diskMask } from './pathLight.ts';
import {
  LIVE_MACRO_PX,
  LIVE_RIM_CAP_MOVING,
  LIVE_RIM_CAP_REST,
  buildLiveFields,
  liveMacroNormals,
  rimResolution,
} from './liveField.ts';

describe('live material fields', () => {
  it('keeps the macro at 64 and follows a moved silhouette', () => {
    assert.equal(LIVE_MACRO_PX, 64);
    const left = diskMask(LIVE_MACRO_PX, 18);
    const right = new Uint8Array(LIVE_MACRO_PX * LIVE_MACRO_PX);
    for (let y = 0; y < LIVE_MACRO_PX; y += 1) {
      for (let x = 0; x < LIVE_MACRO_PX; x += 1) right[y * LIVE_MACRO_PX + x] = left[y * LIVE_MACRO_PX + ((x + 8) % LIVE_MACRO_PX)];
    }
    const a = liveMacroNormals('gummi', left);
    const b = liveMacroNormals('gummi', right);
    assert.equal(a.length, LIVE_MACRO_PX * LIVE_MACRO_PX * 3);
    let moved = 0;
    for (let i = 0; i < a.length; i += 1) moved += Math.abs(a[i] - b[i]);
    assert.ok(moved > 1);
  });

  it('caps the rim grid and reuses a fitted gain while the pose is moving', () => {
    const rest = rimResolution(400, false);
    const moving = rimResolution(400, true);
    assert.equal(rest.cols, LIVE_RIM_CAP_REST);
    assert.equal(moving.cols, LIVE_RIM_CAP_MOVING);
    assert.ok(Math.abs(rest.pxPerPt - LIVE_RIM_CAP_REST / 400) < 1e-12);
    assert.equal(rest.capped, true);
    const small = rimResolution(40, false);
    assert.equal(small.cols, 120);
    assert.equal(small.capped, false);

    const clip = {
      contains(x: number, y: number) {
        const dx = x - 50;
        const dy = y - 50;
        return dx * dx + dy * dy <= 30 * 30;
      },
    };
    const sources = { albedo: null, albedoW: 0, albedoH: 0, sourceAt: (x: number, y: number) => ({ x, y }) };
    const first = buildLiveFields('gummi', clip, 0, 0, 100, 40, false, sources, null);
    assert.equal(first.macro.length, LIVE_MACRO_PX * LIVE_MACRO_PX * 4);
    assert.equal(first.rimK, 0);
    assert.equal(first.fitted, false);
    assert.equal(first.rimSide, 120);
    const held = buildLiveFields('gummi', clip, 0, 0, 100, 400, true, sources, 0.8);
    assert.equal(held.rimK, 0.8);
    assert.equal(held.rimSide, LIVE_RIM_CAP_MOVING);
    assert.equal(held.fitted, false);
    assert.equal(held.rim.length, LIVE_RIM_CAP_MOVING * LIVE_RIM_CAP_MOVING * 4);
  });
});
