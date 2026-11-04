/**
 * Layout v2.1 (2026-11-04).
 *
 * Column: `screenPadding` (24) on each side, capped at `contentMaxWidth` (345), centered.
 * On a 393pt phone that is 24 + 345 + 24. Wider phones keep 345 and center it.
 * The tab bar uses the same column, so primary buttons share its width and x.
 *
 * Top inset is measured under the safe area. The spacing scale is the source of truth.
 * - App screens that lead with a title or count (Refleksjon, Logg, Deg): `space['10']` (40).
 * - Welcome: `space['32']` (128), fixed. The title is not positioned with space-between.
 * - Intro questions: a 44pt nav row (`size['hit-min']`), then `space['12']` (48).
 * Hjem and Økt are centered compositions. They do not use the 40pt inset.
 */
import type { ViewStyle } from 'react-native';

import { screenPadding, size, space } from './theme.ts';

/** Content column and tab bar. Same width, centered on wider phones. */
export const contentMaxWidth = 345;

/** Refleksjon, Logg, Deg. Safe area sits above this. */
export const screenTopInset = space['10'];

/** Welcome. Fixed so the title stays put when the wordmark is gone. */
export const welcomeTopInset = space['32'];

/** Intro question row: back button and progress dots. 44pt hit target. */
export const questionNavHeight = size['hit-min'];

/** Space from the question nav row down to the step title. */
export const questionContentInset = space['12'];

export type ScreenTop = 'gutter' | 'app' | 'welcome' | 'none';

/** Padding under the safe area for a screen shell. */
export function insetUnderSafeArea(top: ScreenTop): number {
  if (top === 'app') return screenTopInset;
  if (top === 'welcome') return welcomeTopInset;
  if (top === 'none') return 0;
  return screenPadding;
}

/**
 * Width of the column at `screenWidth`.
 * Minimum side inset is `screenPadding`. The column never exceeds `contentMaxWidth`.
 */
export function contentColumnWidth(screenWidth: number): number {
  const inner = screenWidth - screenPadding * 2;
  return Math.min(contentMaxWidth, Math.max(0, inner));
}

/** Outer frame: the 24pt side inset. Pair with `contentColumn`. */
export const contentFrame: ViewStyle = {
  width: '100%',
  paddingHorizontal: screenPadding,
};

/** Inner column: 345pt max, centered once the frame is wider than that. */
export const contentColumn: ViewStyle = {
  width: '100%',
  maxWidth: contentMaxWidth,
  alignSelf: 'center',
};
