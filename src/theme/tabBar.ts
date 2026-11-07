/**
 * Tab bar v6 (2026-11-04). Replaces the v4/v5 bars.
 * Light-mode ink is `text.primary` (#111110) and `text.tertiary` (#66635D).
 * The state sheet uses the shadowed component, not the flat one.
 */

export const TAB_BAR = {
  width: 345,
  height: 64,
  radius: 32,
  /** Minimum space under the bar. Home-indicator insets win when they are larger. */
  bottomInset: 26,
  icon: 24,
  stroke: 1.4,
  labelSize: 10,
  activeInk: '#111110',
  inactiveInk: '#66635D',
  activePill: '#F4F3F2',
  /** End inset of the active pill. The gap between pills is half of this. */
  insetX: 5,
  slotGap: 2.5,
  pillHeight: 58,
  pillRadius: 28,
} as const;

/**
 * Dark v6. The light bar above stays as it is.
 * Native UITabBar cannot draw this pill, this glass, or a 20pt blur,
 * so the existing v6 bar paints it. iOS light keeps the system bar.
 */
export const TAB_BAR_DARK = {
  glass: '#2C2B28',
  glassOpacity: 0.72,
  blur: 20,
  edge: 'rgba(248,246,242,0.10)',
  activePill: '#34322E',
  activeInk: '#F8F6F2',
  inactiveInk: '#8C887F',
} as const;

export function tabBarDarkGlass(): string {
  const [r, g, b] = [44, 43, 40];
  return `rgba(${r},${g},${b},${TAB_BAR_DARK.glassOpacity})`;
}

/** Light iOS stays on the system tab bar. Dark uses the existing v6 bar. */
export function tabBarKind(platform: string, themeName: 'light' | 'dark'): 'native' | 'v6' {
  if (platform === 'ios' && themeName === 'light') return 'native';
  return 'v6';
}

/** Drop shadow on the bar. SVG filter: dy 10, blur 14, #3C3228 at 16%. */
export const TAB_BAR_SHADOW = {
  color: '#3C3228',
  opacity: 0.16,
  offsetY: 10,
  radius: 14,
} as const;

/** Shadow under the active pill. SVG filter: dy 1, blur 1.2, #8C857B at 27%. */
export const TAB_PILL_SHADOW = {
  color: '#8C857B',
  opacity: 0.27,
  offsetY: 1,
  radius: 1.2,
} as const;

/** Klumpen drawn in the 24pt tab slot. Stroke scales to 1.4pt. */
export const KLUMPEN_ICON = {
  size: 24,
  viewBox: '-52.16 -52.16 1103.32 1103.32',
  viewWidth: 1103.32,
  strokeWidth: 64.36,
} as const;

export function klumpenIconStrokePt(): number {
  return (KLUMPEN_ICON.strokeWidth * KLUMPEN_ICON.size) / KLUMPEN_ICON.viewWidth;
}

/** Width of one tab slot inside a bar of `barWidth`. 110pt at the 345pt bar. */
export function tabSlotWidth(barWidth: number = TAB_BAR.width): number {
  return (barWidth - TAB_BAR.insetX * 2 - TAB_BAR.slotGap * 2) / 3;
}

type BarRect = { x: number; y: number; width: number; height: number; rx: number };

/**
 * Logg bars, inactive. Stroke is centered, so the filled icon is this shape
 * expanded by half the stroke — same outer edge.
 */
export const LOG_BARS: readonly BarRect[] = [
  { x: 1.6, y: 13.7, width: 3.8, height: 5.6, rx: 0.5 },
  { x: 10.1, y: 7.7, width: 3.8, height: 11.6, rx: 0.5 },
  { x: 18.6, y: 10.7, width: 3.8, height: 8.6, rx: 0.5 },
];

export function outerRect(rect: BarRect, stroke: number = TAB_BAR.stroke): BarRect {
  const pad = stroke / 2;
  const round = (value: number) => Math.round(value * 100) / 100;
  return {
    x: round(rect.x - pad),
    y: round(rect.y - pad),
    width: round(rect.width + stroke),
    height: round(rect.height + stroke),
    rx: round(rect.rx + pad),
  };
}

/** Deg, variant B. Head circle; the body path is the rounded rectangle under it. */
export const DEG_HEAD = { cx: 12, cy: 7.6, r: 2.9 } as const;

export const DEG_BODY =
  'M8.40 13.90H15.60A2.70 2.70 0 0 1 18.30 16.60V18.80A0.50 0.50 0 0 1 17.80 19.30H6.20A0.50 0.50 0 0 1 5.70 18.80V16.60A2.70 2.70 0 0 1 8.40 13.90Z';

/** Filled Deg body: the outline path grown by half of the 1.4pt stroke. */
export const DEG_BODY_FILLED =
  'M8.40 13.20H15.60A3.40 3.40 0 0 1 19.00 16.60V18.80A1.20 1.20 0 0 1 17.80 20.00H6.20A1.20 1.20 0 0 1 5.00 18.80V16.60A3.40 3.40 0 0 1 8.40 13.20Z';

export function degHeadRadius(active: boolean): number {
  const radius = active ? DEG_HEAD.r + TAB_BAR.stroke / 2 : DEG_HEAD.r;
  return Math.round(radius * 10) / 10;
}
