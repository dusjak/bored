import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { KLUMPEN_PATH } from '@/components/klumpenPath';
import {
  DEG_BODY,
  DEG_BODY_FILLED,
  DEG_HEAD,
  KLUMPEN_ICON,
  LOG_BARS,
  TAB_BAR,
  degHeadRadius,
  outerRect,
} from '@/theme/tabBar';

export type TabIconName = 'home' | 'log' | 'profile';

type Props = {
  name: TabIconName;
  active: boolean;
  color: string;
  size?: number;
};

/** Hjem is Klumpen. Logg is three bars. Deg is variant B (head + rounded rectangle). */
export function TabIcon({ name, active, color, size = TAB_BAR.icon }: Props) {
  if (name === 'home') {
    return (
      <Svg width={size} height={size} viewBox={KLUMPEN_ICON.viewBox}>
        <Path
          d={KLUMPEN_PATH}
          fill={active ? color : 'none'}
          stroke={color}
          strokeWidth={KLUMPEN_ICON.strokeWidth}
          strokeLinejoin="round"
        />
      </Svg>
    );
  }
  if (name === 'log') {
    const bars = active ? LOG_BARS.map((bar) => outerRect(bar)) : LOG_BARS;
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {bars.map((bar) => (
          <Rect
            key={`${bar.x}-${bar.y}`}
            x={bar.x}
            y={bar.y}
            width={bar.width}
            height={bar.height}
            rx={bar.rx}
            fill={active ? color : 'none'}
            stroke={active ? 'none' : color}
            strokeWidth={active ? 0 : TAB_BAR.stroke}
          />
        ))}
      </Svg>
    );
  }
  const radius = degHeadRadius(active);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle
        cx={DEG_HEAD.cx}
        cy={DEG_HEAD.cy}
        r={radius}
        fill={active ? color : 'none'}
        stroke={active ? 'none' : color}
        strokeWidth={active ? 0 : TAB_BAR.stroke}
      />
      <Path
        d={active ? DEG_BODY_FILLED : DEG_BODY}
        fill={active ? color : 'none'}
        stroke={active ? 'none' : color}
        strokeWidth={active ? 0 : TAB_BAR.stroke}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
