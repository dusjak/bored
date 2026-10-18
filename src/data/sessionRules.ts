/**
 * What to do with a session that is still `active` when the app comes back.
 *
 * Lock screen and switching apps both suspend the process, so they cannot be
 * told apart. A return while the process is still alive is therefore treated
 * as a lock: the session completes. A cold start after the end time means the
 * process was killed, which is stored as aborted.
 */
export type UnfinishedDecision =
  | { kind: 'resume'; remainingSeconds: number }
  | { kind: 'completed'; actualDurationSeconds: number; endedAtMs: number }
  | { kind: 'aborted'; actualDurationSeconds: number; endedAtMs: number };

export function decideUnfinishedSession(input: {
  nowMs: number;
  startedAtMs: number;
  chosenDurationSeconds: number;
  backgroundedAtMs: number | null;
  returnKind: 'foreground-return' | 'cold-start';
}): UnfinishedDecision {
  const endsAtMs = input.startedAtMs + input.chosenDurationSeconds * 1000;
  if (input.nowMs < endsAtMs) {
    return {
      kind: 'resume',
      remainingSeconds: Math.max(1, Math.ceil((endsAtMs - input.nowMs) / 1000)),
    };
  }
  if (input.returnKind === 'foreground-return') {
    return {
      kind: 'completed',
      actualDurationSeconds: input.chosenDurationSeconds,
      endedAtMs: endsAtMs,
    };
  }
  const mark = input.backgroundedAtMs ?? endsAtMs;
  const elapsedSeconds = Math.floor((mark - input.startedAtMs) / 1000);
  const actual = Math.min(input.chosenDurationSeconds, Math.max(0, elapsedSeconds));
  return {
    kind: 'aborted',
    actualDurationSeconds: actual,
    endedAtMs: mark,
  };
}

/** Elapsed seconds for a session the user ends by holding, capped at the chosen duration. */
export function elapsedSeconds(startedAtMs: number, nowMs: number, chosenDurationSeconds: number): number {
  const elapsed = Math.floor((nowMs - startedAtMs) / 1000);
  return Math.min(chosenDurationSeconds, Math.max(0, elapsed));
}
