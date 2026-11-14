import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { KLUMPEN_PATH } from '@/components/klumpenPath';
import {
  DEG_BODY,
  DEG_BODY_FILLED,
  DEG_HEAD,
  KLUMPEN_ICON,
  LOG_BARS,
  TAB_BAR,
  TAB_ICON_OPTICAL_H,
  containedIconScale,
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

/** Visible ink height shared by the three marks, in the 24 pt slot. */
const OPTICAL_H = TAB_ICON_OPTICAL_H;
const OPTICAL_CY = 11.5;

/** Hjem is Klumpen. Logg is three bars. Deg is variant B (head + rounded rectangle). */
export function TabIcon({ name, active, color, size = TAB_BAR.icon }: Props) {
  if (name === 'home') {
    const drawn = (845.53 / KLUMPEN_ICON.viewWidth) * 24;
    const scale = OPTICAL_H / drawn;
    return (
      <Svg width={size} height={size} viewBox={KLUMPEN_ICON.viewBox}>
        <Path
          d={KLUMPEN_PATH}
          fill={active ? color : 'none'}
          stroke={color}
          strokeWidth={KLUMPEN_ICON.strokeWidth}
          strokeLinejoin="round"
          transform={`translate(500 ${77.23 + 845.53 / 2}) scale(${scale}) translate(-500 ${-(77.23 + 845.53 / 2)})`}
        />
      </Svg>
    );
  }
  if (name === 'log') {
    const bars = active ? LOG_BARS.map((bar) => outerRect(bar)) : LOG_BARS;
    const left = Math.min(...bars.map((bar) => bar.x));
    const right = Math.max(...bars.map((bar) => bar.x + bar.width));
    const top = Math.min(...bars.map((bar) => bar.y));
    const bottom = Math.max(...bars.map((bar) => bar.y + bar.height));
    const scale = containedIconScale(right - left, bottom - top, size);
    const midX = (left + right) / 2;
    const midY = (top + bottom) / 2;
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
            transform={`translate(12 ${OPTICAL_CY}) scale(${scale}) translate(${-midX} ${-midY})`}
          />
        ))}
      </Svg>
    );
  }
  const radius = degHeadRadius(active);
  const top = DEG_HEAD.cy - radius;
  const bottom = 19.3;
  const scale = OPTICAL_H / (bottom - top);
  const mid = (top + bottom) / 2;
  const shift = `translate(12 ${OPTICAL_CY}) scale(${scale}) translate(-12 ${-mid})`;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle
        cx={DEG_HEAD.cx}
        cy={DEG_HEAD.cy}
        r={radius}
        fill={active ? color : 'none'}
        stroke={active ? 'none' : color}
        strokeWidth={active ? 0 : TAB_BAR.stroke}
        transform={shift}
      />
      <Path
        d={active ? DEG_BODY_FILLED : DEG_BODY}
        fill={active ? color : 'none'}
        stroke={active ? 'none' : color}
        strokeWidth={active ? 0 : TAB_BAR.stroke}
        strokeLinejoin="round"
        transform={shift}
      />
    </Svg>
  );
}
