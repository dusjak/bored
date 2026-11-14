import { klumpHeight, klumpWidth } from '../duration/klumpen.ts';
import { HOLD, RING_OFFSET } from '../session/holdToEnd.ts';
import { KLUMPEN_BOUNDS, sessionStoneScale } from '../session/klumpenShape.ts';

/**
 * Space under the practice picture before the hint.
 * A larger lump and its ring sit lower, so the hint moves down with them.
 */
export function practiceHintGap(minutes: number): number {
  const scale = sessionStoneScale(minutes);
  const half = (KLUMPEN_BOUNDS.height * scale) / 2;
  const reach = half + RING_OFFSET + HOLD.glowRFull;
  const boxHalf = klumpHeight(klumpWidth(3)) / 2;
  return 28 + Math.max(0, Math.round(reach - boxHalf));
}
