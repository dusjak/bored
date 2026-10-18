import type { OnboardingProfile } from '@/data/types';

export const PRESET_MINUTES = [5, 10, 15, 20] as const;
export const MIN_CUSTOM_MINUTES = 3;
export const MAX_CUSTOM_MINUTES = 30;
export const DEFAULT_DURATION_MINUTES = 10;
export const HOLD_TO_END_MS = 1000;

/** 1 → "1 minutt", every other count → "N minutter". */
export function minutesPhrase(minutes: number): string {
  const n = Math.max(0, Math.floor(minutes));
  return n === 1 ? '1 minutt' : `${n} minutter`;
}

/** 1 → "1 økt", every other count including 0 → "N økter". */
export function sessionsPhrase(count: number): string {
  const n = Math.max(0, Math.floor(count));
  return n === 1 ? '1 økt' : `${n} økter`;
}

/** Done-screen sentence. Uses the chosen duration, not the elapsed time. */
export function completionSentence(chosenMinutes: number): string {
  return `${minutesPhrase(chosenMinutes)} med ingenting.`;
}

/**
 * Aborted-session copy. Under 60 seconds is not rounded up to 1.
 * Whole minutes are rounded down.
 */
export function abortedPhrase(actualDurationSeconds: number): string {
  const seconds = Math.max(0, Math.floor(actualDurationSeconds));
  if (seconds < 60) return 'Avsluttet etter under 1 min';
  return `Avsluttet etter ${Math.floor(seconds / 60)} min`;
}

/** Accept a custom duration only inside 3–30 minutes, 1 minute steps. */
export function parseCustomMinutes(raw: string): number | null {
  if (!/^\d+$/.test(raw.trim())) return null;
  const n = parseInt(raw, 10);
  if (n < MIN_CUSTOM_MINUTES || n > MAX_CUSTOM_MINUTES) return null;
  return n;
}

const WEEKDAY_SHORT = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'];

const pad = (n: number) => String(n).padStart(2, '0');

/** "I dag, 08:30" / "I går, 09:15" / "Man, 07:50" */
export function formatSessionDate(date: Date, now = new Date()): string {
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOf(now) - startOf(date)) / 86_400_000);
  const clock = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  if (diffDays === 0) return `I dag, ${clock}`;
  if (diffDays === 1) return `I går, ${clock}`;
  return `${WEEKDAY_SHORT[date.getDay()]}, ${clock}`;
}

export function chosenMinutes(chosenDurationSeconds: number): number {
  return Math.round(chosenDurationSeconds / 60);
}

export function emptyProfile(): OnboardingProfile {
  return {};
}
