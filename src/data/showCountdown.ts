/**
 * «Vis nedtelling» is on unless the person turned it off.
 * A stored '0' counts only together with the chosen flag. The old automatic
 * '0' written for an empty install is not a choice, so those phones stay on.
 */
export function showCountdownFromStored(raw: string | null, chosen: boolean): boolean {
  if (raw === '0' && chosen) return false;
  return true;
}

/** The launch path no longer writes an off default. */
export function shouldWriteDefaultCountdownOff(_raw: string | null, _chosen: boolean): boolean {
  return false;
}

/** What launch may do. A missing or legacy value shows the timer. */
export function planCountdownUpgrade(
  raw: string | null,
  chosen: boolean,
): { show: boolean; writeDefaultOff: boolean } {
  return {
    show: showCountdownFromStored(raw, chosen),
    writeDefaultOff: false,
  };
}
