/**
 * Which splash tier plays. Pure, so the launch rules can be tested without React.
 *
 * MegaSplash («Sluket» v5 C) only on first launch and after Nullstill.
 * Splash (D2 Pust) on a later launch, and on a return from background that lasted
 * long enough to be worth a breath. Dråpe is the static wordmark: Reduce Motion,
 * the kill switch, a crash, and a short background return.
 * An active session or reflection shows nothing, so the timer is there immediately.
 */
import {
  BACKGROUND_RETURN_MIN_MS,
  crashHoldMs,
  exitFadeMs,
  PUST_MOTION_MS,
  REDUCE_HOLD_MS,
  STILL_HOLD_MS,
} from './splashTiming.ts';

export type IntroPhase = 'off' | 'play' | 'still' | 'fade' | 'enter';

export type SplashOccasion =
  | 'first-launch'
  | 'after-reset'
  | 'later-launch'
  | 'background-return'
  | 'session';

export type SplashMode = 'mega' | 'pust' | 'drape' | 'none';

export type AppStateEvent = 'active' | 'background' | 'inactive' | 'unknown' | 'extension';

export type SplashDecision = {
  mode: SplashMode;
  holdMs: number;
  fadeMs: number;
  /** Crash fallback writes bored.splashSeen immediately, so a throw cannot loop. */
  markSeenNow: boolean;
  /** Why this mode was chosen. Logged on device in dev builds. */
  reason: string;
};

/** One line for the dev console: occasion, mode, reason. */
export function splashDecisionLog(occasion: SplashOccasion, decision: SplashDecision): string {
  return `[splash] ${occasion} ${decision.mode} ${decision.reason}`;
}

const FIRST_PLAY = new Set<SplashOccasion>(['first-launch', 'after-reset']);

export function isFirstPlay(occasion: SplashOccasion): boolean {
  return FIRST_PLAY.has(occasion);
}

export function decideSplash(input: {
  occasion: SplashOccasion;
  reduceMotion: boolean;
  sluketEnabled: boolean;
  animationFailed: boolean;
  /** Resolved app theme. Dark fades the plate out. Light cuts. */
  darkTheme: boolean;
  /**
   * Background return only. False skips Pust and the Reduce Motion hold:
   * the plate was only there for the iOS snapshot.
   */
  calmSplash?: boolean;
  /** Milliseconds of MegaSplash already played when it crashed. */
  elapsedMs?: number;
}): SplashDecision {
  const fadeMs = exitFadeMs(input.darkTheme);
  if (input.occasion === 'session') {
    return { mode: 'none', holdMs: 0, fadeMs: 0, markSeenNow: false, reason: 'session' };
  }
  if (input.animationFailed) {
    return {
      mode: 'drape',
      holdMs: crashHoldMs(input.elapsedMs ?? 0),
      fadeMs,
      markSeenNow: true,
      reason: 'animation-failed',
    };
  }
  // A short return leaves at once, even under Reduce Motion. The plate is already up.
  if (input.occasion === 'background-return' && input.calmSplash === false) {
    return { mode: 'drape', holdMs: 0, fadeMs, markSeenNow: false, reason: 'short-return' };
  }
  if (input.reduceMotion) {
    return { mode: 'drape', holdMs: REDUCE_HOLD_MS, fadeMs, markSeenNow: false, reason: 'reduce-motion' };
  }
  if (!input.sluketEnabled) {
    return { mode: 'drape', holdMs: STILL_HOLD_MS, fadeMs, markSeenNow: false, reason: 'kill-switch' };
  }
  if (isFirstPlay(input.occasion)) {
    return { mode: 'mega', holdMs: 0, fadeMs: 0, markSeenNow: false, reason: 'first-play' };
  }
  return { mode: 'pust', holdMs: PUST_MOTION_MS, fadeMs, markSeenNow: false, reason: 'later-play' };
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

export type SplashAppReduction = {
  sawBackground: boolean;
  phase: IntroPhase;
  occasion: SplashOccasion;
  armHold: boolean;
  backgroundAtMs: number | null;
  /** True when this return should play Pust. False leaves the snapshot plate immediately. */
  calm: boolean;
};

/**
 * AppState changes.
 * 'inactive' (Control Center, notification shade) is ignored.
 * 'background' shows the wordmark so the iOS snapshot is the splash, unless a
 * session or reflection is on screen. 'active' after that plays Pust only when
 * the app was away for BACKGROUND_RETURN_MIN_MS. Otherwise the plate leaves.
 * A first play that has not handed off is not marked seen by this return.
 */
export function reduceSplashAppState(input: {
  event: AppStateEvent;
  sawBackground: boolean;
  inSessionOrReflection: boolean;
  phase: IntroPhase;
  occasion: SplashOccasion;
  armHold: boolean;
  nowMs: number;
  backgroundAtMs: number | null;
  calm: boolean;
}): SplashAppReduction {
  if (input.event === 'inactive' || input.event === 'unknown' || input.event === 'extension') {
    return {
      sawBackground: input.sawBackground,
      phase: input.phase,
      occasion: input.occasion,
      armHold: input.armHold,
      backgroundAtMs: input.backgroundAtMs,
      calm: input.calm,
    };
  }
  // React Native reports `background` for UIApplicationWillEnterForegroundNotification,
  // including a cold start. That event used to replace a first play with a short
  // return, so MegaSplash never mounted and the wordmark (Dråpe) showed instead.
  // A first play stays a first play until it hands off.
  if (isFirstPlay(input.occasion) && input.phase !== 'off') {
    return {
      sawBackground: input.sawBackground,
      phase: input.phase,
      occasion: input.occasion,
      armHold: input.armHold,
      backgroundAtMs: input.backgroundAtMs,
      calm: input.calm,
    };
  }
  if (input.event === 'background') {
    if (input.inSessionOrReflection) {
      return {
        sawBackground: true,
        phase: 'off',
        occasion: 'session',
        armHold: false,
        backgroundAtMs: input.nowMs,
        calm: false,
      };
    }
    return {
      sawBackground: true,
      phase: 'still',
      occasion: 'background-return',
      armHold: false,
      backgroundAtMs: input.nowMs,
      calm: false,
    };
  }
  if (!input.sawBackground) {
    return {
      sawBackground: false,
      phase: input.phase,
      occasion: input.occasion,
      armHold: input.armHold,
      backgroundAtMs: input.backgroundAtMs,
      calm: input.calm,
    };
  }
  if (input.inSessionOrReflection) {
    return {
      sawBackground: false,
      phase: 'off',
      occasion: 'session',
      armHold: false,
      backgroundAtMs: null,
      calm: false,
    };
  }
  const away = input.backgroundAtMs == null ? BACKGROUND_RETURN_MIN_MS : input.nowMs - input.backgroundAtMs;
  const calm = away >= BACKGROUND_RETURN_MIN_MS;
  return {
    sawBackground: false,
    phase: 'still',
    occasion: 'background-return',
    armHold: true,
    backgroundAtMs: null,
    calm,
  };
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

/**
 * bored.splashSeen is written when MegaSplash hands off, and immediately if the
 * player crashed. A fade (Dråpe, Pust, or a background return) does not write it,
 * so a first play that never finished still plays next launch.
 */
export function shouldPersistSplashSeen(input: {
  phase: IntroPhase;
  crashed: boolean;
  occasion: SplashOccasion;
}): boolean {
  if (input.crashed) return true;
  return input.phase === 'enter' && isFirstPlay(input.occasion);
}
