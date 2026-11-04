/**
 * Side-button center, in UIKit points from the top of the screen.
 *
 * Measured from Apple's dimensional drawings
 * (developer.apple.com/download/files/accessories/dimensional-drawings/).
 * On iPhone 16, 16 Pro, and 16 Pro Max the drawing labels the side-button
 * center at 55.33 mm from the top of the housing, and a witness line meets
 * that center. The display active area is what UIKit points map onto.
 * Top inset is half of (housing length − active area), which the drawings
 * call out as an even inset.
 *
 * 228 pt in the BD-1 frames is the placeholder for one 402×874 canvas.
 * It is not used here. A model that is not in this table gets the hint
 * text and no bulge — the arrow must not point at Camera Control or at a guess.
 *
 * Not yet measured (text only): iPhone 16 Plus, 16e, 15 and earlier, 17, Air, 18.
 * The Simulator reports `arm64` / `x86_64`, not an iPhone model, so it is text only too.
 */

export type SideButtonMeasure = {
  modelId: string;
  name: string;
  /** Millimetres from the top of the housing to the side-button center. */
  fromHousingTopMm: number;
  housingLengthMm: number;
  /** Display active-area height. This is the UIKit point height, in millimetres. */
  activeAreaMm: number;
  /** Portrait point height (`874` is iPhone 16 Pro). */
  pointHeight: number;
};

export const SIDE_BUTTON_MEASURES: readonly SideButtonMeasure[] = [
  {
    modelId: 'iPhone17,3',
    name: 'iPhone 16',
    fromHousingTopMm: 55.33,
    housingLengthMm: 147.64,
    activeAreaMm: 141.09,
    pointHeight: 852,
  },
  {
    modelId: 'iPhone17,1',
    name: 'iPhone 16 Pro',
    fromHousingTopMm: 55.33,
    housingLengthMm: 149.61,
    activeAreaMm: 144.79,
    pointHeight: 874,
  },
  {
    modelId: 'iPhone17,2',
    name: 'iPhone 16 Pro Max',
    fromHousingTopMm: 55.33,
    housingLengthMm: 163.03,
    activeAreaMm: 158.31,
    pointHeight: 956,
  },
];

/** Center of the side button, in points from the top of the display. */
export function sideButtonCenterPt(measure: Omit<SideButtonMeasure, 'modelId' | 'name'>): number {
  const insetMm = (measure.housingLengthMm - measure.activeAreaMm) / 2;
  const fromActiveMm = measure.fromHousingTopMm - insetMm;
  return Math.round((fromActiveMm / measure.activeAreaMm) * measure.pointHeight);
}

const CENTER_BY_MODEL: Record<string, number> = Object.fromEntries(
  SIDE_BUTTON_MEASURES.map((measure) => [measure.modelId, sideButtonCenterPt(measure)]),
);

const SIMULATOR_IDS = new Set(['arm64', 'x86_64', 'i386', 'iPhone Simulator']);

/**
 * `modelId` is `expo-device`'s `Device.modelId` (`iPhone17,1`).
 * Returns null when the phone is not in the table, including the Simulator.
 */
export function sideButtonCenterForModel(modelId: string | null | undefined): number | null {
  if (!modelId || SIMULATOR_IDS.has(modelId)) return null;
  const center = CENTER_BY_MODEL[modelId];
  return center == null ? null : center;
}
