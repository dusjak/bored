import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { KLUMPEN_BOUNDS, KLUMPEN_RADII, klumpenPoints, outlineBounds, writeKlumpenPath } from './klumpenShape.ts';

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
    );
    assert.equal(commands.length, KLUMPEN_RADII.length + 1);
    assert.equal(commands[0], 'M 150.00 64.58');
    assert.equal(commands[commands.length - 1], 'Z');
    const right = commands[45];
    assert.ok(right.startsWith('L 237.'));
  });
});
