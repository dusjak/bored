/**
 * When the splash plays. Pure, so the launch rules can be tested without React.
 *
 * Full «Sluket» only on first launch and after Nullstill.
 * Everywhere else is the static wordmark, except an active session or reflection,
 * which shows nothing so the timer is there immediately.
 */
import { crashHoldMs, REDUCE_FADE_MS, REDUCE_HOLD_MS, STILL_HOLD_MS } from './splashTiming.ts';

export type IntroPhase = 'off' | 'play' | 'still' | 'fade' | 'enter';

export type SplashOccasion =
  | 'first-launch'
  | 'after-reset'
  | 'later-launch'
  | 'background-return'
  | 'session';

export type SplashMode = 'sluket' | 'still' | 'none';

export type AppStateEvent = 'active' | 'background' | 'inactive' | 'unknown' | 'extension';

export type SplashDecision = {
  mode: SplashMode;
  holdMs: number;
  fadeMs: number;
  /** Crash fallback writes bored.splashSeen immediately, so a throw cannot loop. */
  markSeenNow: boolean;
};

const FIRST_PLAY = new Set<SplashOccasion>(['first-launch', 'after-reset']);

export function isFirstPlay(occasion: SplashOccasion): boolean {
  return FIRST_PLAY.has(occasion);
}

export function decideSplash(input: {
  occasion: SplashOccasion;
  reduceMotion: boolean;
  sluketEnabled: boolean;
  animationFailed: boolean;
  /** Milliseconds of Sluket already played when it crashed. */
  elapsedMs?: number;
}): SplashDecision {
  if (input.occasion === 'session') {
    return { mode: 'none', holdMs: 0, fadeMs: 0, markSeenNow: false };
  }
  if (input.animationFailed) {
    return {
      mode: 'still',
      holdMs: crashHoldMs(input.elapsedMs ?? 0),
      fadeMs: REDUCE_FADE_MS,
      markSeenNow: true,
    };
  }
  if (input.reduceMotion || !input.sluketEnabled || !isFirstPlay(input.occasion)) {
    const firstReduce = input.reduceMotion && isFirstPlay(input.occasion);
    return {
      mode: 'still',
      holdMs: firstReduce ? REDUCE_HOLD_MS : STILL_HOLD_MS,
      fadeMs: REDUCE_FADE_MS,
      markSeenNow: false,
    };
  }
  return { mode: 'sluket', holdMs: 0, fadeMs: 0, markSeenNow: false };
}

/** Cold start, after storage has been read. */
export function initialSplash(input: {
  splashSeen: boolean;
  inSessionOrReflection: boolean;
}): { occasion: SplashOccasion; phase: IntroPhase } {
  if (input.inSessionOrReflection) return { occasion: 'session', phase: 'off' };
  if (!input.splashSeen) return { occasion: 'first-launch', phase: 'play' };
  return { occasion: 'later-launch', phase: 'still' };
}

/** Profil → Nullstill. The seen flag is already gone with the rest of settings. */
export function splashAfterReset(): { occasion: SplashOccasion; phase: IntroPhase } {
  return { occasion: 'after-reset', phase: 'play' };
}

/**
 * TODO: The real existing-account flow replaces the button that calls this.
 * Same motion as a cold first launch. Does not read or write storage.
 */
export function splashReplay(): { occasion: SplashOccasion; phase: IntroPhase } {
  return { occasion: 'first-launch', phase: 'play' };
}

/**
 * AppState changes.
 * 'inactive' (Control Center, notification shade) is ignored.
 * 'background' shows the wordmark so the iOS snapshot is the splash, unless a
 * session or reflection is on screen. 'active' after that holds, then fades.
 */
export function reduceSplashAppState(input: {
  event: AppStateEvent;
  sawBackground: boolean;
  inSessionOrReflection: boolean;
  phase: IntroPhase;
  occasion: SplashOccasion;
  armHold: boolean;
}): {
  sawBackground: boolean;
  phase: IntroPhase;
  occasion: SplashOccasion;
  armHold: boolean;
} {
  if (input.event === 'inactive' || input.event === 'unknown' || input.event === 'extension') {
    return {
      sawBackground: input.sawBackground,
      phase: input.phase,
      occasion: input.occasion,
      armHold: input.armHold,
    };
  }
  if (input.event === 'background') {
    if (input.inSessionOrReflection) {
      return { sawBackground: true, phase: 'off', occasion: 'session', armHold: false };
    }
    return { sawBackground: true, phase: 'still', occasion: 'background-return', armHold: false };
  }
  if (!input.sawBackground) {
    return {
      sawBackground: false,
      phase: input.phase,
      occasion: input.occasion,
      armHold: input.armHold,
    };
  }
  if (input.inSessionOrReflection) {
    return { sawBackground: false, phase: 'off', occasion: 'session', armHold: false };
  }
  return { sawBackground: false, phase: 'still', occasion: 'background-return', armHold: true };
}

/** True while the user should see the timer or the reflection, not a splash. */
export function splashSuppressed(input: {
  pathname: string;
  launch: 'onboarding' | 'home' | 'session' | 'reflection';
  activeSession: boolean;
}): boolean {
  if (input.activeSession) return true;
  if (input.pathname === '/session' || input.pathname === '/reflection') return true;
  if (input.pathname === '/' || input.pathname === '') {
    return input.launch === 'session' || input.launch === 'reflection';
  }
  return false;
}

/** bored.splashSeen is written on fade/enter, and immediately if the player crashed. */
export function shouldPersistSplashSeen(input: { phase: IntroPhase; crashed: boolean }): boolean {
  return input.crashed || input.phase === 'fade' || input.phase === 'enter';
}
