import { useReducedMotion } from 'react-native-reanimated';

import { features } from '@/config/features';
import { StillSplash, type SplashProps } from '@/components/StillSplash';

export type { SplashProps };

/**
 * First-launch overlay. Reduce Motion, and features.sluketAnimation === false,
 * both use the still wordmark (600 ms, then a 200 ms fade) and do not load SluketPlay.
 */
export function SluketSplash(props: SplashProps) {
  const reduceMotion = useReducedMotion();
  if (!features.sluketAnimation || reduceMotion) return <StillSplash {...props} />;
  const play = require('./SluketPlay') as typeof import('./SluketPlay');
  return <play.SluketPlay {...props} />;
}
