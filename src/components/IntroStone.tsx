import { LiveKlump } from './LiveKlump';
import type { KlumpMaterialId } from '@/data/types';

type Props = {
  minutes: number;
  material: KlumpMaterialId;
  offsets: readonly number[];
  digits?: boolean;
  widthPt?: number;
  ring?: { progress: number; opacity: number };
};

/** Every onboarding stone uses the live material on the current silhouette. */
export function IntroStone(props: Props) {
  return <LiveKlump {...props} />;
}
