import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { S6_DOT_W, S6_DOT_X, S6_DOT_Y } from './s6.ts';
import { cubicBezierY, INK_RGB, logoPose, REST_AT } from './sluket.ts';
import { pustPose, pustScale, PUST_FROM_MS, PUST_MOTION_MS, PUST_PEAK, PUST_TO_MS } from './pust.ts';
import { EXIT_FADE_MS } from './splashTiming.ts';

type Curve = {
  kolonner: string[];
  rammer: (number | string)[][];
};

describe('D2 Pust', () => {
  it('holds the wordmark and only scales Klumpen about its centre', () => {
    const rest = logoPose(REST_AT, 1, INK_RGB);
    const start = pustPose(0);
    assert.equal(start.kw, S6_DOT_W);
    assert.equal(start.dx, S6_DOT_X);
    assert.equal(start.dy, S6_DOT_Y);
    assert.equal(start.dx, rest.dx);
    assert.equal(start.settled, 1);
    assert.deepEqual(start, rest);
    assert.equal(pustScale(0), 1);
    assert.equal(pustScale(PUST_FROM_MS), 1);
    assert.equal(pustScale(350), PUST_PEAK);
    assert.equal(pustScale(PUST_TO_MS), 1);
    assert.equal(pustScale(PUST_MOTION_MS), 1);
    const peak = pustPose(350);
    assert.ok(Math.abs(peak.kw - S6_DOT_W * PUST_PEAK) < 1e-9);
    assert.equal(peak.dx, rest.dx);
    assert.equal(peak.dy, rest.dy);
    assert.equal(peak.clipLeft, rest.clipLeft);
    assert.equal(peak.clipRight, rest.clipRight);
    const back = pustPose(PUST_MOTION_MS);
    assert.deepEqual(back, rest);
  });

  it('matches kurve-D2.json, including the dark-theme fade samples', () => {
    const curve = JSON.parse(readFileSync(new URL('./kurve-D2.json', import.meta.url), 'utf8')) as Curve;
    const columns = curve.kolonner;
    const msAt = columns.indexOf('ms');
    const sxAt = columns.indexOf('sx');
    const syAt = columns.indexOf('sy');
    const anchorAt = columns.indexOf('anker');
    const fadeAt = columns.indexOf('fade');
    assert.ok(msAt >= 0 && sxAt >= 0 && syAt >= 0 && fadeAt >= 0);
    for (const row of curve.rammer) {
      const ms = Number(row[msAt]);
      const sx = Number(row[sxAt]);
      const sy = Number(row[syAt]);
      const fadeSample = Number(row[fadeAt]);
      assert.equal(row[anchorAt], 'c');
      assert.ok(Math.abs(sx - sy) < 1e-9, `scale stays uniform at ${ms}`);
      if (ms <= PUST_MOTION_MS) {
        assert.ok(Math.abs(pustScale(ms) - sx) < 0.0015, `scale at ${ms}: ${pustScale(ms)} vs ${sx}`);
      }
      const fade = ms < PUST_MOTION_MS ? 0 : cubicBezierY(0.4, 0, 1, 1, (ms - PUST_MOTION_MS) / EXIT_FADE_MS);
      assert.ok(Math.abs(fade - fadeSample) < 0.02, `fade at ${ms}: ${fade} vs ${fadeSample}`);
    }
  });

  it('does not read the theme, and the player fades with the plate', () => {
    for (const file of ['pust.ts', '../components/PustPlay.tsx', '../components/usePlateExit.ts']) {
      const source = readFileSync(new URL(file, import.meta.url), 'utf8');
      assert.equal(source.includes('useTheme'), false, file);
      assert.equal(source.includes('useColorScheme'), false, file);
      assert.equal(source.includes('<Text'), false, file);
    }
    const play = readFileSync(new URL('../components/PustPlay.tsx', import.meta.url), 'utf8');
    assert.equal(play.includes('pustPose'), true);
    assert.equal(play.includes('usePlateExit'), true);
    assert.equal(play.includes('fadeMs'), true);
  });
});
