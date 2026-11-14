/**
 * Layout v2.1 (2026-11-04).
 *
 * Column: `screenPadding` (24) on each side of every phone. The 345pt cap is only
 * for tablets and other wide windows (`contentColumnCapMinWidth`, 600). A 393pt
 * phone is still 24 + 345 + 24. A 440pt phone is 24 + 392 + 24. The tab bar uses
 * the same column, so primary buttons share its width and x.
 *
 * Top inset is measured under the safe area. The spacing scale is the source of truth.
 * - App screens that lead with a title or count (Refleksjon, Logg, Deg): `space['10']` (40).
 * - Welcome: `space['32']` (128), fixed. The title is not positioned with space-between.
 * - Intro questions: a 44pt nav row (`size['hit-min']`), then `space['6']` (24).
 *   The old «n av N» line under the nav is gone, so the title sits one step higher.
 * Hjem and Økt are centered compositions. They do not use the 40pt inset.
 */
import type { ViewStyle } from 'react-native';

import { screenPadding, size, space } from './theme.ts';

/** Content column and tab bar on a 393pt phone, and the cap from tablet width up. */
export const contentMaxWidth = 345;

/**
 * Windows this wide keep the 345pt column. Phones, including 440pt Pro Max, do not.
 * iPad portrait starts at 744. 600 sits between the largest phone and the smallest tablet.
 */
export const contentColumnCapMinWidth = 600;

export function contentColumnCapped(screenWidth: number): boolean {
  return screenWidth >= contentColumnCapMinWidth;
}

/** Refleksjon, Logg, Deg. Safe area sits above this. */
export const screenTopInset = space['10'];

/** Welcome. Fixed so the title stays put when the wordmark is gone. */
export const welcomeTopInset = space['32'];

/** Intro question row: back button and progress dots. 44pt hit target. */
export const questionNavHeight = size['hit-min'];

/**
 * Space from the question nav row down to the step title.
 * Was `space['12']` (48) while the «n av N» line occupied the gap.
 * The line is gone, so the title moves up to `space['6']` (24).
 */
export const questionContentInset = space['6'];

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
 * Side inset stays `screenPadding` on phones. From `contentColumnCapMinWidth` the
 * column stops at `contentMaxWidth` and centers in the frame.
 */
export function contentColumnWidth(screenWidth: number): number {
  const inner = Math.max(0, screenWidth - screenPadding * 2);
  if (contentColumnCapped(screenWidth)) return Math.min(contentMaxWidth, inner);
  return inner;
}

/** Outer frame: the 24pt side inset. Pair with `contentColumn`. */
export const contentFrame: ViewStyle = {
  width: '100%',
  paddingHorizontal: screenPadding,
};

/** Inner column. Full width of the 24pt frame. Wide windows add the 345pt cap. */
export const contentColumn: ViewStyle = {
  width: '100%',
  alignSelf: 'center',
};

export function contentColumnForWidth(screenWidth: number): ViewStyle {
  if (!contentColumnCapped(screenWidth)) return contentColumn;
  return { ...contentColumn, maxWidth: contentMaxWidth };
}
