/**
 * Side-button center, in UIKit points from the top of the screen.
 *
 * Measured from Apple's dimensional drawings
 * (developer.apple.com/download/files/accessories/dimensional-drawings/).
 * Each row uses the side-button center the drawing dimensions from the top
 * of the housing. A witness line meets that center. The display active area
 * is what UIKit points map onto. Top inset is half of (housing length −
 * active area), which the drawings call out as an even inset, and it matches
 * the labeled "all around" inset on every row below.
 *
 * 15 and 15 Plus share one inset (3.275 mm). 15 Pro and 15 Pro Max share
 * another (2.760 mm), and the same 56.17 mm button center. The 16 series
 * shares 55.33 mm.
 *
 * 228 pt in the BD-1 frames is the placeholder for one 402×874 canvas.
 * It is not used here. A model that is not in this table gets the hint
 * text and no bulge — the arrow must not point at Camera Control or at a guess.
 *
 * Not yet measured (text only): iPhone 16 Plus, 16e, 14 and earlier, 17, Air, 18.
 * The Simulator reports `arm64` / `x86_64`, not an iPhone model, so it is text only too.
 *
 * `modelId` is the hardware machine id (`uname`), for example `iPhone16,1`
 * on an iPhone 15 Pro. `expo-device` reads that id in Expo Go and in an
 * EAS / TestFlight binary, so the same string selects the row in both.
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
    modelId: 'iPhone15,4',
    name: 'iPhone 15',
    fromHousingTopMm: 53.37,
    housingLengthMm: 147.64,
    activeAreaMm: 141.09,
    pointHeight: 852,
  },
  {
    modelId: 'iPhone15,5',
    name: 'iPhone 15 Plus',
    fromHousingTopMm: 52.49,
    housingLengthMm: 160.89,
    activeAreaMm: 154.34,
    pointHeight: 932,
  },
  {
    modelId: 'iPhone16,1',
    name: 'iPhone 15 Pro',
    fromHousingTopMm: 56.17,
    housingLengthMm: 146.61,
    activeAreaMm: 141.09,
    pointHeight: 852,
  },
  {
    modelId: 'iPhone16,2',
    name: 'iPhone 15 Pro Max',
    fromHousingTopMm: 56.17,
    housingLengthMm: 159.86,
    activeAreaMm: 154.34,
    pointHeight: 932,
  },
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
  if (!modelId) return null;
  const id = modelId.trim();
  if (SIMULATOR_IDS.has(id)) return null;
  const center = CENTER_BY_MODEL[id];
  return center == null ? null : center;
}
