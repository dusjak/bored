import { Component, type ReactNode } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import { StillSplash, type SplashProps } from '@/components/StillSplash';
import { features } from '@/config/features';
import { decideSplash, type SplashOccasion } from '@/splash/splashDecision';

export type { SplashProps };

type OverlayProps = SplashProps & {
  occasion: SplashOccasion;
  /** Milliseconds of Sluket already on screen. Read when the player throws. */
  elapsedMs: () => number;
  /** Writes bored.splashSeen so a crash cannot replay forever. */
  onCrash: () => void;
};

type BoundaryProps = {
  children: ReactNode;
  still: SplashProps;
  elapsedMs: () => number;
  onCrash: () => void;
};

type BoundaryState = { failed: boolean; holdMs: number };

/** Catches a render throw from SluketPlay, including a failed Skia import, and shows the still wordmark. */
class SplashErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false, holdMs: 0 };

  static getDerivedStateFromError(): Partial<BoundaryState> {
    return { failed: true };
  }

  componentDidCatch(): void {
    const decision = decideSplash({
      occasion: 'first-launch',
      reduceMotion: false,
      sluketEnabled: true,
      animationFailed: true,
      elapsedMs: this.props.elapsedMs(),
    });
    this.setState({ holdMs: decision.holdMs });
    if (decision.markSeenNow) this.props.onCrash();
  }

  render() {
    if (!this.state.failed) return this.props.children;
    // The plate is up immediately. The hold is whatever is left of the rest frame.
    return <StillSplash {...this.props.still} armed={this.state.holdMs > 0} holdMs={this.state.holdMs || 300} />;
  }
}

function SluketPlayLoader(props: SplashProps) {
  const play = require('./SluketPlay') as typeof import('./SluketPlay');
  return <play.SluketPlay {...props} />;
}

/**
 * Full «Sluket» only for a first launch or Nullstill, and only when motion is allowed.
 * Reduce Motion, the kill switch, a later launch, and a crash all use the still wordmark.
 * SluketPlay stays unloaded in those cases.
 */
export function SluketSplash({ occasion, elapsedMs, onCrash, ...still }: OverlayProps) {
  const reduceMotion = useReducedMotion() === true;
  const decision = decideSplash({
    occasion,
    reduceMotion,
    sluketEnabled: features.sluketAnimation,
    animationFailed: false,
  });

  if (decision.mode !== 'sluket') {
    return <StillSplash {...still} holdMs={decision.holdMs} fadeMs={decision.fadeMs} />;
  }

  return (
    <SplashErrorBoundary still={still} elapsedMs={elapsedMs} onCrash={onCrash}>
      <SluketPlayLoader {...still} />
    </SplashErrorBoundary>
  );
}
