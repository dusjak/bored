import { useId } from 'react';
import Svg, { ClipPath, Defs, Path, Rect } from 'react-native-svg';

import {
  FYLLING,
  FYLLING_DASH,
  FYLLING_FIELD,
  FYLLING_HALF_CLIP,
  FYLLING_STROKE,
  KLUMPEN_D,
  type FyllingName,
} from '../data/fylling';

type Props = {
  name: FyllingName;
  color: string;
};

/** Klumpen fill states for the time-of-day cards. No background plate. */
export function FyllingIcon({ name, color }: Props) {
  const spec = FYLLING[name];
  const clipId = `fylling${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const filled = spec.fill === 'full' || spec.fill === 'half';
  return (
    <Svg
      width={FYLLING_FIELD}
      height={FYLLING_FIELD}
      viewBox={`0 0 ${FYLLING_FIELD} ${FYLLING_FIELD}`}
      accessible={false}
      pointerEvents="none"
    >
      {spec.fill === 'half' ? (
        <Defs>
          <ClipPath id={clipId}>
            <Rect x={0} y={0} width={FYLLING_HALF_CLIP} height={FYLLING_FIELD} />
          </ClipPath>
        </Defs>
      ) : null}
      {filled ? (
        <Path d={KLUMPEN_D} fill={color} clipPath={spec.fill === 'half' ? `url(#${clipId})` : undefined} />
      ) : null}
      <Path
        d={KLUMPEN_D}
        fill="none"
        stroke={color}
        strokeWidth={FYLLING_STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={spec.dash ? FYLLING_DASH : undefined}
      />
    </Svg>
  );
}
