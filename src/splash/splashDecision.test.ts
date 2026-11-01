import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { crashHoldMs, REDUCE_FADE_MS, REDUCE_HOLD_MS, STILL_HOLD_MS } from './splashTiming.ts';
import {
  decideSplash,
  initialSplash,
  reduceSplashAppState,
  shouldPersistSplashSeen,
  splashAfterReset,
  splashSuppressed,
} from './splashDecision.ts';

const base = {
  reduceMotion: false,
  sluketEnabled: true,
  animationFailed: false,
};

describe('splash decision', () => {
  it('plays Sluket on first launch', () => {
    const boot = initialSplash({ splashSeen: false, inSessionOrReflection: false });
    assert.deepEqual(boot, { occasion: 'first-launch', phase: 'play' });
    const decision = decideSplash({ ...base, occasion: boot.occasion });
    assert.equal(decision.mode, 'sluket');
    assert.equal(decision.markSeenNow, false);
  });

  it('plays Sluket after Nullstill', () => {
    const boot = splashAfterReset();
    assert.deepEqual(boot, { occasion: 'after-reset', phase: 'play' });
    const decision = decideSplash({ ...base, occasion: boot.occasion });
    assert.equal(decision.mode, 'sluket');
  });

  it('shows the still wordmark on a later launch', () => {
    const boot = initialSplash({ splashSeen: true, inSessionOrReflection: false });
    assert.deepEqual(boot, { occasion: 'later-launch', phase: 'still' });
    const decision = decideSplash({ ...base, occasion: boot.occasion });
    assert.equal(decision.mode, 'still');
    assert.equal(decision.holdMs, STILL_HOLD_MS);
    assert.equal(decision.holdMs, 300);
    assert.equal(decision.fadeMs, REDUCE_FADE_MS);
    assert.equal(decision.fadeMs, 200);
    assert.equal(decision.markSeenNow, false);
  });

  it('shows the still wordmark when returning from the background', () => {
    const background = reduceSplashAppState({
      event: 'background',
      sawBackground: false,
      inSessionOrReflection: false,
      phase: 'off',
      occasion: 'later-launch',
      armHold: true,
    });
    assert.equal(background.phase, 'still');
    assert.equal(background.occasion, 'background-return');
    assert.equal(background.armHold, false);
    assert.equal(background.sawBackground, true);
    const active = reduceSplashAppState({
      event: 'active',
      sawBackground: background.sawBackground,
      inSessionOrReflection: false,
      phase: background.phase,
      occasion: background.occasion,
      armHold: background.armHold,
    });
    assert.equal(active.phase, 'still');
    assert.equal(active.armHold, true);
    assert.equal(active.sawBackground, false);
    const decision = decideSplash({ ...base, occasion: 'background-return' });
    assert.equal(decision.mode, 'still');
    assert.equal(decision.holdMs, 300);
    assert.equal(decision.fadeMs, 200);
  });

  it('shows nothing during a session or reflection, including a background return', () => {
    const cold = initialSplash({ splashSeen: true, inSessionOrReflection: true });
    assert.deepEqual(cold, { occasion: 'session', phase: 'off' });
    assert.equal(decideSplash({ ...base, occasion: 'session' }).mode, 'none');
    const background = reduceSplashAppState({
      event: 'background',
      sawBackground: false,
      inSessionOrReflection: true,
      phase: 'off',
      occasion: 'session',
      armHold: false,
    });
    assert.equal(background.phase, 'off');
    assert.equal(background.occasion, 'session');
    const back = reduceSplashAppState({
      event: 'active',
      sawBackground: true,
      inSessionOrReflection: true,
      phase: 'off',
      occasion: 'session',
      armHold: false,
    });
    assert.equal(back.phase, 'off');
    assert.equal(splashSuppressed({ pathname: '/session', launch: 'home', activeSession: false }), true);
    assert.equal(splashSuppressed({ pathname: '/reflection', launch: 'home', activeSession: false }), true);
    assert.equal(splashSuppressed({ pathname: '/', launch: 'reflection', activeSession: false }), true);
    assert.equal(splashSuppressed({ pathname: '/home', launch: 'reflection', activeSession: false }), false);
  });

  it('ignores inactive so Control Center does not flash the wordmark', () => {
    const next = reduceSplashAppState({
      event: 'inactive',
      sawBackground: false,
      inSessionOrReflection: false,
      phase: 'off',
      occasion: 'later-launch',
      armHold: true,
    });
    assert.equal(next.phase, 'off');
    assert.equal(next.occasion, 'later-launch');
    assert.equal(next.sawBackground, false);
    assert.equal(next.armHold, true);
  });

  it('uses the still wordmark when Reduce Motion is on, including first launch', () => {
    const first = decideSplash({ ...base, occasion: 'first-launch', reduceMotion: true });
    assert.equal(first.mode, 'still');
    assert.equal(first.holdMs, REDUCE_HOLD_MS);
    assert.equal(first.holdMs, 600);
    assert.equal(first.fadeMs, 200);
    const later = decideSplash({ ...base, occasion: 'later-launch', reduceMotion: true });
    assert.equal(later.mode, 'still');
    assert.equal(later.holdMs, 300);
    const reset = decideSplash({ ...base, occasion: 'after-reset', reduceMotion: true });
    assert.equal(reset.holdMs, 600);
  });

  it('uses the still wordmark when the kill switch is off', () => {
    const decision = decideSplash({ ...base, occasion: 'first-launch', sluketEnabled: false });
    assert.equal(decision.mode, 'still');
    assert.equal(decision.holdMs, 300);
    assert.equal(decision.markSeenNow, false);
  });

  it('sets the seen flag when the animation crashes, and holds the rest of the timeline', () => {
    const decision = decideSplash({
      ...base,
      occasion: 'first-launch',
      animationFailed: true,
      elapsedMs: 400,
    });
    assert.equal(decision.mode, 'still');
    assert.equal(decision.markSeenNow, true);
    assert.equal(decision.holdMs, crashHoldMs(400));
    assert.equal(decision.holdMs, 1450);
    assert.equal(crashHoldMs(0), 1850);
    assert.equal(crashHoldMs(1700), 300);
    assert.equal(crashHoldMs(2000), 300);
    assert.equal(shouldPersistSplashSeen({ phase: 'play', crashed: true }), true);
    assert.equal(shouldPersistSplashSeen({ phase: 'play', crashed: false }), false);
    assert.equal(shouldPersistSplashSeen({ phase: 'fade', crashed: false }), true);
    assert.equal(shouldPersistSplashSeen({ phase: 'enter', crashed: false }), true);
    assert.equal(shouldPersistSplashSeen({ phase: 'off', crashed: false }), false);
  });
});

describe('splash assets', () => {
  it('points the native splash at the wordmark, in both appearances', () => {
    const app = JSON.parse(readFileSync(new URL('../../app.json', import.meta.url), 'utf8')) as {
      expo: {
        userInterfaceStyle: string;
        plugins: unknown[];
      };
    };
    assert.equal(app.expo.userInterfaceStyle, 'automatic');
    const plugin = app.expo.plugins.find(
      (entry) => Array.isArray(entry) && entry[0] === 'expo-splash-screen',
    ) as [string, Record<string, unknown>] | undefined;
    assert.ok(plugin);
    const config = plugin[1];
    assert.equal(config.backgroundColor, '#F0EDE7');
    assert.equal(config.image, './assets/splash/splash-wordmark-light.png');
    assert.equal(config.imageWidth, 160);
    assert.equal(config.resizeMode, 'contain');
    const dark = config.dark as { backgroundColor: string; image: string };
    assert.equal(dark.backgroundColor, '#111110');
    assert.equal(dark.image, './assets/splash/splash-wordmark-dark.png');
  });

  it('ships the wordmark at 1x, 2x and 3x and the iPhone 16 Pro references', () => {
    const root = new URL('../../assets/splash/', import.meta.url);
    assert.deepEqual(pngSize(new URL('splash-wordmark-light.png', root)), { width: 160, height: 80 });
    assert.deepEqual(pngSize(new URL('splash-wordmark-dark.png', root)), { width: 160, height: 80 });
    assert.deepEqual(pngSize(new URL('splash-wordmark-light@2x.png', root)), { width: 320, height: 160 });
    assert.deepEqual(pngSize(new URL('splash-wordmark-dark@2x.png', root)), { width: 320, height: 160 });
    assert.deepEqual(pngSize(new URL('splash-wordmark-light@3x.png', root)), { width: 480, height: 240 });
    assert.deepEqual(pngSize(new URL('splash-wordmark-dark@3x.png', root)), { width: 480, height: 240 });
    assert.deepEqual(pngSize(new URL('ref/preview-light-402x874@2x.png', root)), { width: 804, height: 1748 });
    assert.deepEqual(pngSize(new URL('ref/preview-dark-402x874@2x.png', root)), { width: 804, height: 1748 });
    const meta = JSON.parse(readFileSync(new URL('splash-wordmark.json', root), 'utf8')) as {
      canvas_pt: number[];
      font_size_pt: number;
      '@1x': { pen_x_pt: number; baseline_y_pt: number };
    };
    assert.deepEqual(meta.canvas_pt, [160, 80]);
    assert.equal(meta.font_size_pt, 52);
    // Pen start on the canvas is the window centre minus 71.55. Baseline is 3.87 below the centre.
    assert.ok(Math.abs(meta['@1x'].pen_x_pt - (80 - 71.55)) < 0.02);
    assert.ok(Math.abs(meta['@1x'].baseline_y_pt - (40 + 3.87)) < 0.02);
  });
});

function pngSize(file: URL): { width: number; height: number } {
  const buf = readFileSync(file);
  assert.deepEqual([...buf.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(buf.toString('ascii', 12, 16), 'IHDR');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}
