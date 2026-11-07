/**
 * «Vis nedtelling».
 * A stored '1' or '0' is an explicit choice and is never rewritten.
 * A missing key is off only for an empty install. Any other stored row keeps the old on default.
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

/** What launch may do. An existing install is never asked to write a default. */
export function planCountdownUpgrade(
  raw: string | null,
  hasExistingInstall: boolean,
): { show: boolean; writeDefaultOff: boolean } {
  return {
    show: showCountdownFromStored(raw, hasExistingInstall),
    writeDefaultOff: shouldWriteDefaultCountdownOff(raw, hasExistingInstall),
  };
}
