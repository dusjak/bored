/**
 * Logg backup hint. Local only: these flags are not part of a sync payload.
 * Completed sessions are counted from `sessions.status = 'completed'`.
 */

export const BACKUP_NUDGE_FIRST_AT = 3;
export const BACKUP_NUDGE_LAST_AT = 10;
export const BACKUP_NUDGE_MIN_GAP = 3;

export type NudgeFlags = {
  /** 0, 1, or 2. Two dismissals and the card never returns. */
  dismissCount: number;
  /** Completed sessions at the latest dismiss. Null when it has never been dismissed. */
  dismissedAtSessions: number | null;
  /** ISO time for debugging. The show rule does not read it. */
  dismissedAt: string | null;
  /** Set when «Jeg vil ha det» is tapped. Only Nullstill clears it. */
  interestNoted: boolean;
};

export const EMPTY_NUDGE: NudgeFlags = {
  dismissCount: 0,
  dismissedAtSessions: null,
  dismissedAt: null,
  interestNoted: false,
};

/**
 * `!interestNoted && completed >= 3 && (dismissCount === 0 || (dismissCount === 1 && completed >= 10 && completed - dismissedAtSessions >= 3))`.
 * A missing session count counts as 0. Saying yes in Deg or in the hint hides the card.
 */
export function shouldShowBackupNudge(flags: NudgeFlags, completed: number): boolean {
  const dismissedAtSessions = flags.dismissedAtSessions ?? 0;
  return (
    !flags.interestNoted &&
    completed >= BACKUP_NUDGE_FIRST_AT &&
    (flags.dismissCount === 0 ||
      (flags.dismissCount === 1 &&
        completed >= BACKUP_NUDGE_LAST_AT &&
        completed - dismissedAtSessions >= BACKUP_NUDGE_MIN_GAP))
  );
}

/** × and «Ikke nå» share this. The count stops at 2. */
export function nudgeAfterDismiss(flags: NudgeFlags, completed: number, dismissedAt: string): NudgeFlags {
  return {
    dismissCount: Math.min(2, flags.dismissCount + 1),
    dismissedAtSessions: completed,
    dismissedAt,
    interestNoted: flags.interestNoted,
  };
}
