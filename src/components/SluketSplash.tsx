import { Component, useEffect, type ReactNode } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import { StillSplash, type SplashProps } from '@/components/StillSplash';
import { features } from '@/config/features';
import { decideSplash, splashDecisionLog, type SplashOccasion } from '@/splash/splashDecision';
import { CRASH_HOLD_MIN_MS, exitFadeMs, PUST_MOTION_MS } from '@/splash/splashTiming';

export type { SplashProps };

type OverlayProps = Omit<SplashProps, 'holdMs' | 'fadeMs'> & {
  occasion: SplashOccasion;
  /** False on a short background return: leave the snapshot plate without Pust. */
  calmSplash: boolean;
  /** Dark app fades the plate. Light app cuts. The plate itself stays dark. */
  darkTheme: boolean;
  /** Milliseconds of MegaSplash already on screen. Read when the player throws. */
  elapsedMs: () => number;
  /** Writes bored.splashSeen so a MegaSplash crash cannot replay forever. */
  onCrash: () => void;
};

type BoundaryProps = {
  children: ReactNode;
  still: SplashProps;
  elapsedMs: () => number;
  onCrash: () => void;
  darkTheme: boolean;
  /** MegaSplash holds the rest of its timeline. Pust holds the rest of the breathe. */
  kind: 'mega' | 'pust';
};

type BoundaryState = { failed: boolean; holdMs: number; fadeMs: number };

/** Catches a render throw, including a failed Skia import, and shows Dråpe. */
class SplashErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false, holdMs: 0, fadeMs: 0 };

  static getDerivedStateFromError(): Partial<BoundaryState> {
    return { failed: true };
  }

  componentDidCatch(): void {
    const elapsed = Math.max(0, this.props.elapsedMs());
    if (this.props.kind === 'mega') {
      const decision = decideSplash({
        occasion: 'first-launch',
        reduceMotion: false,
        sluketEnabled: true,
        animationFailed: true,
        darkTheme: this.props.darkTheme,
        elapsedMs: elapsed,
      });
      this.setState({ holdMs: decision.holdMs, fadeMs: decision.fadeMs });
      if (decision.markSeenNow) this.props.onCrash();
      return;
    }
    const left = Math.max(CRASH_HOLD_MIN_MS, PUST_MOTION_MS - elapsed);
    this.setState({ holdMs: left, fadeMs: exitFadeMs(this.props.darkTheme) });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <StillSplash
        {...this.props.still}
        armed={this.state.holdMs > 0}
        holdMs={this.state.holdMs || CRASH_HOLD_MIN_MS}
        fadeMs={this.state.fadeMs}
      />
    );
  }
}

function SluketPlayLoader(props: SplashProps) {
  const play = require('./SluketPlay') as typeof import('./SluketPlay');
  return <play.SluketPlay {...props} />;
}

function PustPlayLoader(props: SplashProps) {
  const play = require('./PustPlay') as typeof import('./PustPlay');
  return <play.PustPlay {...props} />;
}

/**
 * MegaSplash on a first launch or Nullstill, when motion is allowed.
 * Pust on a later launch and on a long return from background.
 * Dråpe for Reduce Motion, the kill switch, a crash, and a short return.
 * The animated players stay unloaded on Dråpe.
 */
export function SluketSplash({
  occasion,
  calmSplash,
  darkTheme,
  elapsedMs,
  onCrash,
  ...plate
}: OverlayProps) {
  const reduceMotion = useReducedMotion() === true;
  const decision = decideSplash({
    occasion,
    reduceMotion,
    sluketEnabled: features.sluketAnimation,
    animationFailed: false,
    darkTheme,
    calmSplash,
  });
  const tuned: SplashProps = { ...plate, holdMs: decision.holdMs, fadeMs: decision.fadeMs };
  const decisionLine = splashDecisionLog(occasion, decision);
  useEffect(() => {
    // Dev only. A TestFlight or production bundle has __DEV__ false, so this stays quiet there.
    if (typeof __DEV__ === 'undefined' || __DEV__ !== true) return;
    console.log(decisionLine);
  }, [decisionLine]);
  // The background snapshot is the rest mark. Keep Pust mounted while that plate is up
  // so a long return starts the breathe without swapping components.
  const coverReturn =
    occasion === 'background-return' && !reduceMotion && features.sluketAnimation && !calmSplash;

  if (decision.mode === 'none') return null;
  if (decision.mode === 'drape' && !coverReturn) return <StillSplash {...tuned} />;
  if (decision.mode === 'pust' || coverReturn) {
    const play = decision.mode === 'pust' && plate.armed;
    const leaveNow = coverReturn && plate.armed;
    return (
      <SplashErrorBoundary still={tuned} elapsedMs={elapsedMs} onCrash={onCrash} darkTheme={darkTheme} kind="pust">
        <PustPlayLoader {...tuned} armed={play} fading={tuned.fading || leaveNow} />
      </SplashErrorBoundary>
    );
  }
  return (
    <SplashErrorBoundary still={tuned} elapsedMs={elapsedMs} onCrash={onCrash} darkTheme={darkTheme} kind="mega">
      <SluketPlayLoader {...tuned} />
    </SplashErrorBoundary>
  );
}
