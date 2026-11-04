import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  KLUMPEN_BOUNDS,
  KLUMPEN_RADII,
  centroidOffset,
  klumpenPoints,
  outlineBounds,
  sessionStoneScale,
  sessionStoneWidth,
  sessionTextureRect,
  writeKlumpenPath,
} from './klumpenShape.ts';

describe('klumpen shape', () => {
  it('is the 176 pt Småstein, sampled all the way around', () => {
    assert.equal(KLUMPEN_RADII.length, 180);
    assert.ok(Math.abs(KLUMPEN_BOUNDS.width - 176) < 0.05);
    assert.ok(KLUMPEN_BOUNDS.height > 145 && KLUMPEN_BOUNDS.height < 155);
    assert.ok(KLUMPEN_BOUNDS.minX < 0 && KLUMPEN_BOUNDS.maxX > 0);
    assert.ok(KLUMPEN_BOUNDS.minY < 0 && KLUMPEN_BOUNDS.maxY > 0);
  });

  it('widens and flattens under squash, and the contour sits outside the edge', () => {
    const rest = outlineBounds(klumpenPoints(0, 0, 0, 0, 0).xs, klumpenPoints(0, 0, 0, 0, 0).ys);
    const squashed = klumpenPoints(0.04, 0, 0, 0, 0);
    const wide = outlineBounds(squashed.xs, squashed.ys);
    assert.ok(wide.width > rest.width + 4);
    assert.ok(wide.height < rest.height - 2);
    const edge = klumpenPoints(0, 0, 0, 0, 0);
    const ring = klumpenPoints(0, 0, 0, 0, 11.25);
    for (let i = 0; i < edge.xs.length; i += 4) {
      const inner = Math.hypot(edge.xs[i], edge.ys[i]);
      const outer = Math.hypot(ring.xs[i], ring.ys[i]);
      assert.ok(outer > inner + 8);
    }
  });

  it('draws a closed screen-space outline with the top above the centre', () => {
    const commands: string[] = [];
    writeKlumpenPath(
      {
        moveTo(x, y) {
          commands.push(`M ${x.toFixed(2)} ${y.toFixed(2)}`);
        },
        lineTo(x, y) {
          commands.push(`L ${x.toFixed(2)} ${y.toFixed(2)}`);
        },
        close() {
          commands.push('Z');
        },
      },
      150,
      140,
      0,
      0,
      0,
      0,
      0,
      1,
    );
    assert.equal(commands.length, KLUMPEN_RADII.length + 1);
    assert.equal(commands[0], 'M 150.00 64.58');
    assert.equal(commands[commands.length - 1], 'Z');
    const right = commands[45];
    assert.ok(right.startsWith('L 237.'));
  });

  it('follows the chosen duration at 120, 160, 200 and 240 pt', () => {
    assert.deepEqual(
      [5, 10, 15, 20].map((minutes) => sessionStoneWidth(minutes)),
      [120, 160, 200, 240],
    );
    assert.equal(sessionStoneWidth(12), 160);
    assert.equal(sessionStoneWidth(13), 200);
    assert.ok(Math.abs(sessionStoneScale(5) - 120 / KLUMPEN_BOUNDS.width) < 1e-9);
    assert.ok(Math.abs(sessionStoneWidth(10) / sessionStoneScale(10) - KLUMPEN_BOUNDS.width) < 1e-6);
  });

  it('keeps the centroid about 0.7 pt right and 2.4 pt below the box centre, scaled with size', () => {
    const atBase = centroidOffset(1);
    assert.ok(Math.abs(atBase.x - 0.7) < 0.15, `x ${atBase.x}`);
    assert.ok(Math.abs(atBase.y - 2.4) < 0.15, `y ${atBase.y}`);
    const grown = centroidOffset(240 / 176);
    assert.ok(Math.abs(grown.x / atBase.x - 240 / 176) < 1e-9);
    assert.ok(Math.abs(grown.y / atBase.y - 240 / 176) < 1e-9);
    const rect = sessionTextureRect(180, 170, 1);
    assert.equal(rect.width, 192);
    assert.equal(rect.height, 164);
    assert.ok(Math.abs(rect.x + rect.width / 2 - (180 - atBase.x)) < 1e-9);
    assert.ok(Math.abs(rect.y + rect.height / 2 - (170 - atBase.y)) < 1e-9);
  });
});
