/**
 * «Vis nedtelling».
 * A stored '1' or '0' is an explicit choice and is never rewritten.
 * A missing key is off for a new install, and stays on for an install that
 * already had the old default (onboarded, or any finished session).
 */
export function showCountdownFromStored(raw: string | null, hasExistingInstall: boolean): boolean {
  if (raw === '1') return true;
  if (raw === '0') return false;
  return hasExistingInstall;
}

/** True only when a new install has no stored choice. Does not touch '0' or '1'. */
export function shouldWriteDefaultCountdownOff(raw: string | null, hasExistingInstall: boolean): boolean {
  if (hasExistingInstall) return false;
  return raw !== '0' && raw !== '1';
}
