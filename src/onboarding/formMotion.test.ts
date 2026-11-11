import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { FORM_BINS, REST_RADII, emptyOffsets } from './formShape.ts';
import { followOffsets, radialCage, smoothClosed } from './formMotion.ts';

function contourIsDrawable(points: readonly { x: number; y: number }[]): boolean {
  return points.length >= 3 && points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
}

/** Default parameters are not copied into a UI worklet. A named default throws there. */
export function workletNamedDefaults(source: string): string[] {
  const hits: string[] = [];
  const mark = /['"]worklet['"]/g;
  let found: RegExpExecArray | null;
  while ((found = mark.exec(source))) {
    const before = source.slice(0, found.index);
    const close = before.lastIndexOf(')');
    const open = before.lastIndexOf('(', close);
    if (open < 0 || close < 0) continue;
    const params = before.slice(open + 1, close);
    const named = params.match(/=\s*[A-Za-z_$][\w$]*/g);
    if (named) hits.push(...named);
  }
  return hits;
}

describe('shaping motion', () => {
  it('eases toward the finger instead of jumping', () => {
    const current = emptyOffsets();
    const target = emptyOffsets();
    target[3] = 40;
    const step = followOffsets(current, target, 0.5);
    assert.equal(step.next[3], 20);
    assert.ok(step.remaining > 0);
    const done = followOffsets(target, target, 0.5);
    assert.equal(done.remaining, 0);
  });

  it('draws a closed smooth outline through every bin', () => {
    assert.equal(REST_RADII.length, FORM_BINS);
    const cage = radialCage(emptyOffsets(), 200, REST_RADII);
    assert.equal(cage.length, FORM_BINS);
    const smooth = smoothClosed(cage, 4);
    assert.equal(smooth.length, FORM_BINS * 4);
    const first = smooth[0];
    const last = smooth[smooth.length - 1];
    assert.ok(first && last);
    assert.ok(Math.hypot(first.x - last.x, first.y - last.y) > 1);
    let far = 0;
    for (const point of smooth) {
      const radius = Math.hypot(point.x, point.y);
      if (radius > far) far = radius;
    }
    assert.ok(far < 200);
    assert.ok(far > 40);
  });

  it('starts from a drawable rest contour and does not build a Skia path inside the worklet', () => {
    const rest = smoothClosed(radialCage(emptyOffsets(), 200, REST_RADII));
    assert.equal(contourIsDrawable(rest), true);
    const idle = followOffsets(emptyOffsets(), emptyOffsets(), 0.45);
    assert.equal(idle.remaining, 0);
    assert.equal(idle.next.length, FORM_BINS);
    const stone = readFileSync(join(process.cwd(), 'src/components/FormStone.tsx'), 'utf8');
    assert.deepEqual(workletNamedDefaults(readFileSync(join(process.cwd(), 'src/onboarding/formMotion.ts'), 'utf8')), []);
    assert.deepEqual(workletNamedDefaults(readFileSync(join(process.cwd(), 'src/onboarding/formShape.ts'), 'utf8')), []);
    assert.deepEqual(workletNamedDefaults(stone), []);
    assert.match(stone, /smoothClosed\(radialCage\(shown\.value, widthPt, REST_RADII\), 4\)/);
    assert.match(stone, /usePathValue/);
    assert.doesNotMatch(stone, /useDerivedValue|poke\(|_value/);
    assert.match(stone, /points\.length < 3/);
    assert.match(stone, /addCircle/);
  });
});
