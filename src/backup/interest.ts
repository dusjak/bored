/**
 * Honest fake door. The only stored fact is that this phone asked for backup.
 * Nullstill wipes `settings`, so the flag goes away with everything else.
 */

export const BACKUP_INTEREST_NOTED_KEY = 'backup.interestNoted';

/** Chip. 8pt on the sides, 2pt top and bottom, then 8pt after the title. */
export const COMING_TAG_PAD_X = 8;
export const COMING_TAG_PAD_Y = 2;
export const COMING_TAG_GAP = 8;

/** The anonymous line stays 12pt above the button in both states. */
export const INTEREST_CAPTION_GAP = 12;

/** Logg hint keeps the thanks line up for this long, then collapses. */
export const NUDGE_THANKS_MS = 2000;

export type InterestThemeName = 'light' | 'dark';

/**
 * Thanks is sand. Dark uses accent (sand.400, #C4B09A).
 * Light uses the link token (sand.700, #7D6650) so the line clears the sheet.
 */
export function interestThanksColor(
  themeName: InterestThemeName,
  colors: { accent: string; link: string },
): string {
  return themeName === 'dark' ? colors.accent : colors.link;
}
