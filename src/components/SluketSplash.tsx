import { features } from '@/config/features';
import { StillSplash, type SplashProps } from '@/components/StillSplash';

export type { SplashProps };

/**
 * First-launch overlay. The spiral stays unloaded while features.sluketAnimation is false:
 * this module does not import SluketPlay, so its worklets are never evaluated.
 * The still path is the Reduce Motion splash (600 ms wordmark, 200 ms fade).
 */
export function SluketSplash(props: SplashProps) {
  if (!features.sluketAnimation) return <StillSplash {...props} />;
  const play = require('./SluketPlay') as typeof import('./SluketPlay');
  return <play.SluketPlay {...props} />;
}
