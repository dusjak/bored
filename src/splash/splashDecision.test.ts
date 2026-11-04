import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import {
  BACKGROUND_RETURN_MIN_MS,
  crashHoldMs,
  EXIT_FADE_MS,
  PUST_MOTION_MS,
  REDUCE_FADE_MS,
  REDUCE_HOLD_MS,
  STILL_HOLD_MS,
} from './splashTiming.ts';
import {
  decideSplash,
  initialSplash,
  isFirstPlay,
  reduceSplashAppState,
  shouldPersistSplashSeen,
  splashAfterReset,
  splashReplay,
  splashSuppressed,
} from './splashDecision.ts';

const base = {
  reduceMotion: false,
  sluketEnabled: true,
  animationFailed: false,
  darkTheme: true,
  calmSplash: true,
};

function background(partial: {
  event: 'active' | 'background' | 'inactive' | 'unknown' | 'extension';
  sawBackground?: boolean;
  inSessionOrReflection?: boolean;
  phase?: 'off' | 'play' | 'still' | 'fade' | 'enter';
  occasion?: 'first-launch' | 'after-reset' | 'later-launch' | 'background-return' | 'session';
  armHold?: boolean;
  nowMs?: number;
  backgroundAtMs?: number | null;
  calm?: boolean;
}) {
  return reduceSplashAppState({
    sawBackground: false,
    inSessionOrReflection: false,
    phase: 'off',
    occasion: 'later-launch',
    armHold: true,
    nowMs: 0,
    backgroundAtMs: null,
    calm: true,
    ...partial,
  });
}

describe('splash decision', () => {
  it('treats first launch and Nullstill as the only full plays', () => {
    assert.equal(isFirstPlay('first-launch'), true);
    assert.equal(isFirstPlay('after-reset'), true);
    assert.equal(isFirstPlay('later-launch'), false);
    assert.equal(isFirstPlay('background-return'), false);
    assert.equal(isFirstPlay('session'), false);
  });

  it('plays MegaSplash on first launch', () => {
    const boot = initialSplash({ splashSeen: false, inSessionOrReflection: false });
    assert.deepEqual(boot, { occasion: 'first-launch', phase: 'play' });
    const decision = decideSplash({ ...base, occasion: boot.occasion });
    assert.equal(decision.mode, 'mega');
    assert.equal(decision.fadeMs, 0);
    assert.equal(decision.markSeenNow, false);
  });

  it('plays MegaSplash after Nullstill', () => {
    const boot = splashAfterReset();
    assert.deepEqual(boot, { occasion: 'after-reset', phase: 'play' });
    const decision = decideSplash({ ...base, occasion: boot.occasion });
    assert.equal(decision.mode, 'mega');
  });

  it('replays the full first-launch MegaSplash without a data reset', () => {
    const boot = splashReplay();
    assert.deepEqual(boot, { occasion: 'first-launch', phase: 'play' });
    assert.equal(decideSplash({ ...base, occasion: boot.occasion }).mode, 'mega');
  });

  it('plays D2 Pust on a later launch, and cuts when the app is light', () => {
    const boot = initialSplash({ splashSeen: true, inSessionOrReflection: false });
    assert.deepEqual(boot, { occasion: 'later-launch', phase: 'still' });
    const dark = decideSplash({ ...base, occasion: boot.occasion });
    assert.equal(dark.mode, 'pust');
    assert.equal(dark.holdMs, PUST_MOTION_MS);
    assert.equal(dark.holdMs, 700);
    assert.equal(dark.fadeMs, EXIT_FADE_MS);
    assert.equal(dark.fadeMs, REDUCE_FADE_MS);
    assert.equal(dark.fadeMs, 200);
    assert.equal(dark.markSeenNow, false);
    const light = decideSplash({ ...base, occasion: 'later-launch', darkTheme: false });
    assert.equal(light.mode, 'pust');
    assert.equal(light.fadeMs, 0);
  });

  it('plays Pust after a long background return, and leaves immediately after a short one', () => {
    const away = background({ event: 'background', nowMs: 10_000 });
    assert.equal(away.phase, 'still');
    assert.equal(away.occasion, 'background-return');
    assert.equal(away.armHold, false);
    assert.equal(away.sawBackground, true);
    assert.equal(away.backgroundAtMs, 10_000);
    assert.equal(away.calm, false);

    const brief = background({
      event: 'active',
      sawBackground: away.sawBackground,
      phase: away.phase,
      occasion: away.occasion,
      armHold: away.armHold,
      nowMs: 10_000 + BACKGROUND_RETURN_MIN_MS - 1,
      backgroundAtMs: away.backgroundAtMs,
      calm: away.calm,
    });
    assert.equal(brief.phase, 'still');
    assert.equal(brief.armHold, true);
    assert.equal(brief.sawBackground, false);
    assert.equal(brief.calm, false);
    assert.equal(brief.backgroundAtMs, null);
    const briefDecision = decideSplash({ ...base, occasion: 'background-return', calmSplash: brief.calm });
    assert.equal(briefDecision.mode, 'drape');
    assert.equal(briefDecision.holdMs, 0);
    assert.equal(briefDecision.fadeMs, 200);

    const long = background({
      event: 'active',
      sawBackground: true,
      phase: 'still',
      occasion: 'background-return',
      armHold: false,
      nowMs: 10_000 + BACKGROUND_RETURN_MIN_MS,
      backgroundAtMs: 10_000,
      calm: false,
    });
    assert.equal(long.calm, true);
    assert.equal(long.armHold, true);
    const longDecision = decideSplash({ ...base, occasion: 'background-return', calmSplash: long.calm });
    assert.equal(longDecision.mode, 'pust');
    assert.equal(longDecision.holdMs, 700);
    assert.equal(longDecision.fadeMs, 200);
    const longLight = decideSplash({
      ...base,
      occasion: 'background-return',
      calmSplash: true,
      darkTheme: false,
    });
    assert.equal(longLight.fadeMs, 0);
  });

  it('shows nothing during a session or reflection, including a background return', () => {
    const cold = initialSplash({ splashSeen: true, inSessionOrReflection: true });
    assert.deepEqual(cold, { occasion: 'session', phase: 'off' });
    assert.equal(decideSplash({ ...base, occasion: 'session' }).mode, 'none');
    const hidden = background({
      event: 'background',
      inSessionOrReflection: true,
      occasion: 'session',
      armHold: false,
      nowMs: 4_000,
    });
    assert.equal(hidden.phase, 'off');
    assert.equal(hidden.occasion, 'session');
    const back = background({
      event: 'active',
      sawBackground: true,
      inSessionOrReflection: true,
      occasion: 'session',
      armHold: false,
      nowMs: 90_000,
      backgroundAtMs: 4_000,
    });
    assert.equal(back.phase, 'off');
    assert.equal(back.calm, false);
    assert.equal(splashSuppressed({ pathname: '/session', launch: 'home', activeSession: false }), true);
    assert.equal(splashSuppressed({ pathname: '/reflection', launch: 'home', activeSession: false }), true);
    assert.equal(splashSuppressed({ pathname: '/', launch: 'reflection', activeSession: false }), true);
    assert.equal(splashSuppressed({ pathname: '/home', launch: 'reflection', activeSession: false }), false);
  });

  it('ignores inactive so Control Center does not flash the wordmark', () => {
    const next = background({
      event: 'inactive',
      phase: 'off',
      occasion: 'later-launch',
      armHold: true,
      nowMs: 50_000,
      calm: true,
    });
    assert.equal(next.phase, 'off');
    assert.equal(next.occasion, 'later-launch');
    assert.equal(next.sawBackground, false);
    assert.equal(next.armHold, true);
    assert.equal(next.calm, true);
  });

  it('uses Dråpe for 600 ms whenever Reduce Motion is on, including a later launch', () => {
    const first = decideSplash({ ...base, occasion: 'first-launch', reduceMotion: true });
    assert.equal(first.mode, 'drape');
    assert.equal(first.holdMs, REDUCE_HOLD_MS);
    assert.equal(first.holdMs, 600);
    assert.equal(first.fadeMs, 200);
    assert.equal(first.markSeenNow, false);
    const later = decideSplash({ ...base, occasion: 'later-launch', reduceMotion: true });
    assert.equal(later.mode, 'drape');
    assert.equal(later.holdMs, 600);
    const reset = decideSplash({ ...base, occasion: 'after-reset', reduceMotion: true });
    assert.equal(reset.mode, 'drape');
    assert.equal(reset.holdMs, 600);
    const returned = decideSplash({
      ...base,
      occasion: 'background-return',
      calmSplash: true,
      reduceMotion: true,
    });
    assert.equal(returned.mode, 'drape');
    assert.equal(returned.holdMs, 600);
    const light = decideSplash({ ...base, occasion: 'first-launch', reduceMotion: true, darkTheme: false });
    assert.equal(light.fadeMs, 0);
  });

  it('uses Dråpe when the kill switch is off, including a later launch', () => {
    const first = decideSplash({ ...base, occasion: 'first-launch', sluketEnabled: false });
    assert.equal(first.mode, 'drape');
    assert.equal(first.holdMs, STILL_HOLD_MS);
    assert.equal(first.holdMs, 300);
    assert.equal(first.markSeenNow, false);
    const later = decideSplash({ ...base, occasion: 'later-launch', sluketEnabled: false });
    assert.equal(later.mode, 'drape');
    assert.equal(later.holdMs, 300);
  });

  it('a short return skips the Reduce Motion hold', () => {
    const decision = decideSplash({
      ...base,
      occasion: 'background-return',
      calmSplash: false,
      reduceMotion: true,
    });
    assert.equal(decision.mode, 'drape');
    assert.equal(decision.holdMs, 0);
  });

  it('sets the seen flag when MegaSplash crashes, and holds the rest of the timeline', () => {
    const decision = decideSplash({
      ...base,
      occasion: 'first-launch',
      animationFailed: true,
      elapsedMs: 400,
    });
    assert.equal(decision.mode, 'drape');
    assert.equal(decision.markSeenNow, true);
    assert.equal(decision.holdMs, crashHoldMs(400));
    assert.equal(decision.holdMs, 2750);
    assert.equal(decision.fadeMs, 200);
    assert.equal(crashHoldMs(0), 3150);
    assert.equal(crashHoldMs(150), 3000);
    assert.equal(crashHoldMs(2850), 300);
    assert.equal(crashHoldMs(3450), 300);
    assert.equal(shouldPersistSplashSeen({ phase: 'play', crashed: true, occasion: 'first-launch' }), true);
    assert.equal(shouldPersistSplashSeen({ phase: 'play', crashed: false, occasion: 'first-launch' }), false);
    assert.equal(shouldPersistSplashSeen({ phase: 'enter', crashed: false, occasion: 'first-launch' }), true);
    assert.equal(shouldPersistSplashSeen({ phase: 'enter', crashed: false, occasion: 'later-launch' }), false);
    assert.equal(shouldPersistSplashSeen({ phase: 'fade', crashed: false, occasion: 'first-launch' }), false);
    assert.equal(shouldPersistSplashSeen({ phase: 'fade', crashed: false, occasion: 'background-return' }), false);
    assert.equal(shouldPersistSplashSeen({ phase: 'off', crashed: false, occasion: 'later-launch' }), false);
  });
});

describe('splash assets', () => {
  it('points the native splash at the S6 wordmark, in both appearances', () => {
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
    assert.equal(config.backgroundColor, '#111110');
    assert.equal(config.image, './assets/splash/splash-wordmark-s6-dark.png');
    assert.equal(config.imageWidth, 160);
    assert.equal(config.resizeMode, 'contain');
    const dark = config.dark as { backgroundColor: string; image: string };
    assert.equal(dark.backgroundColor, '#111110');
    assert.equal(dark.image, './assets/splash/splash-wordmark-s6-dark.png');
    const appIos = (JSON.parse(readFileSync(new URL('../../app.json', import.meta.url), 'utf8')) as {
      expo: { ios: { infoPlist: { CADisableMinimumFrameDurationOnPhone: boolean } } };
    }).expo.ios.infoPlist;
    assert.equal(appIos.CADisableMinimumFrameDurationOnPhone, true);
  });

  it('ships the S6 native plate at 1x, 2x and 3x', () => {
    const root = new URL('../../assets/splash/', import.meta.url);
    assert.deepEqual(pngSize(new URL('splash-wordmark-s6-dark.png', root)), { width: 160, height: 80 });
    assert.deepEqual(pngSize(new URL('splash-wordmark-s6-dark@2x.png', root)), { width: 320, height: 160 });
    assert.deepEqual(pngSize(new URL('splash-wordmark-s6-dark@3x.png', root)), { width: 480, height: 240 });
    assert.equal(existsSync(new URL('splash-wordmark-light.png', root)), false);
    assert.equal(existsSync(new URL('splash-wordmark-dark.png', root)), false);
    const mork = readFileSync(new URL('../../assets/logo/wordmark-S6-mork.svg', import.meta.url), 'utf8');
    const lys = readFileSync(new URL('../../assets/logo/wordmark-S6-lys.svg', import.meta.url), 'utf8');
    assert.equal(mork.includes('fill="#F8F6F2"'), true);
    assert.equal(lys.includes('fill="#111110"'), true);
    assert.equal(mork.replaceAll('#F8F6F2', ''), lys.replaceAll('#111110', ''));
    assert.deepEqual(pngSize(new URL('ref/preview-dark-402x874@2x.png', root)), { width: 804, height: 1748 });
    const meta = JSON.parse(readFileSync(new URL('splash-wordmark.json', root), 'utf8')) as {
      canvas_pt: number[];
      native_canvas_pt: number[];
      native_image: string;
      background: string;
      ink: string;
      dot_center_pt: number[];
      dot_width_pt: number;
    };
    assert.deepEqual(meta.canvas_pt, [148, 46]);
    assert.deepEqual(meta.native_canvas_pt, [160, 80]);
    assert.equal(meta.native_image, 'splash-wordmark-s6-dark.png');
    assert.equal(meta.background, '#111110');
    assert.equal(meta.ink, '#F8F6F2');
    assert.deepEqual(meta.dot_center_pt, [67.2257, 7.1784]);
    assert.equal(meta.dot_width_pt, 13.5487);
  });
});

function pngSize(file: URL): { width: number; height: number } {
  const buf = readFileSync(file);
  assert.deepEqual([...buf.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(buf.toString('ascii', 12, 16), 'IHDR');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}
