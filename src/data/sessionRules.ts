/**
 * What to do with a session that is still `active` when the app comes back.
 *
 * A lock and an app switch both suspend the process, and a later cold start
 * cannot tell those apart from a force-quit. Once the scheduled end has passed,
 * the session is completed from its timestamps (startedAt + chosen duration).
 * Ending early is only the hold gesture, which does not use this function.
 */
export type UnfinishedDecision =
  | { kind: 'resume'; remainingSeconds: number }
  | { kind: 'completed'; actualDurationSeconds: number; endedAtMs: number };

export function decideUnfinishedSession(input: {
  nowMs: number;
  startedAtMs: number;
  chosenDurationSeconds: number;
}): UnfinishedDecision {
  const endsAtMs = input.startedAtMs + input.chosenDurationSeconds * 1000;
  if (input.nowMs < endsAtMs) {
    return {
      kind: 'resume',
      remainingSeconds: Math.max(1, Math.ceil((endsAtMs - input.nowMs) / 1000)),
    };
  }
  return {
    kind: 'completed',
    actualDurationSeconds: input.chosenDurationSeconds,
    endedAtMs: endsAtMs,
  };
}

/** Elapsed seconds for a session the user ends by holding, capped at the chosen duration. */
export function elapsedSeconds(startedAtMs: number, nowMs: number, chosenDurationSeconds: number): number {
  const elapsed = Math.floor((nowMs - startedAtMs) / 1000);
  return Math.min(chosenDurationSeconds, Math.max(0, elapsed));
}
