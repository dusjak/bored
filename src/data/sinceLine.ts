import { boredSinceLine } from './copy.ts';

/** Written only when this process observed a real empty install or a Nullstill. */
export const FIRST_USED_TRUSTED_KEY = 'bored.firstUsedAt.trusted';

/** A parseable instant. The older `bored.firstUsedAt` key is not accepted here. */
export function trustedFirstUse(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

/**
 * Display the since-line only from a trusted instant.
 * An existing install with no trusted instant stays blank and is not backfilled.
 * A genuinely empty install may store `nowIso` once.
 */
export function sinceLinePlan(input: {
  trustedRaw: string | null;
  hasPriorData: boolean;
  nowIso: string;
}): { displayIso: string | null; writeTrusted: string | null } {
  const trusted = trustedFirstUse(input.trustedRaw);
  if (trusted) return { displayIso: trusted, writeTrusted: null };
  if (input.hasPriorData) return { displayIso: null, writeTrusted: null };
  const now = trustedFirstUse(input.nowIso);
  if (!now) return { displayIso: null, writeTrusted: null };
  return { displayIso: now, writeTrusted: now };
}

export function sinceLineText(iso: string | null): string | null {
  const trusted = trustedFirstUse(iso);
  if (!trusted) return null;
  return boredSinceLine(new Date(trusted));
}

/**
 * Deg v2.2 places the since-line under the name. It does not say to drop the
 * date when the name was skipped. The 8 pt gap applies only when both exist.
 */
export function degHeaderLines(
  name: string | null | undefined,
  since: string | null,
): { name: string | null; since: string | null } {
  return { name: name ? name : null, since };
}
