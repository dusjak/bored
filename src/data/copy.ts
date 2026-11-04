import type { OnboardingProfile } from '@/data/types';

export const PRESET_MINUTES = [5, 10, 15, 20] as const;
export const MIN_CUSTOM_MINUTES = 5;
export const MAX_CUSTOM_MINUTES = 20;
export const DEFAULT_DURATION_MINUTES = 10;
export const HOLD_TO_END_MS = 1000;

/** Number and unit for a mixed-font duration, e.g. `{ value: '10', unit: 'minutter' }`. */
export function durationParts(minutes: number): { value: string; unit: string } {
  const n = Math.max(0, Math.floor(minutes));
  return { value: String(n), unit: n === 1 ? 'minutt' : 'minutter' };
}

/** 1 → "1 minutt", every other count → "N minutter". */
export function minutesPhrase(minutes: number): string {
  const { value, unit } = durationParts(minutes);
  return `${value} ${unit}`;
}

/** Deg appearance choices, in sheet order. `system` is «Automatisk». */
export const APPEARANCE_OPTIONS = [
  { id: 'light', label: 'Lys' },
  { id: 'dark', label: 'Mørk' },
  { id: 'system', label: 'Automatisk' },
] as const;

export type AppearanceId = (typeof APPEARANCE_OPTIONS)[number]['id'];

export const APPEARANCE_SYSTEM_CAPTION = 'Automatisk følger telefonen.';

/** Saves the appearance preview. Dismissing the sheet does not. */
export const APPEARANCE_CONFIRM = 'Velg';

export function appearanceLabel(id: AppearanceId): string {
  return APPEARANCE_OPTIONS.find((option) => option.id === id)?.label ?? 'Lys';
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

/** Accept a custom duration only inside 5–20 minutes, whole minutes. */
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

/** Keeps a stored length inside the custom range. Anything outside falls back to 10. */
export function clampDurationMinutes(minutes: number): number {
  if (!Number.isFinite(minutes)) return DEFAULT_DURATION_MINUTES;
  const n = Math.round(minutes);
  if (n < MIN_CUSTOM_MINUTES || n > MAX_CUSTOM_MINUTES) return DEFAULT_DURATION_MINUTES;
  return n;
}

export function emptyProfile(): OnboardingProfile {
  return {};
}

/** Clock for the daily reminder. An unset or varying time uses 08:00. */
export function reminderSchedule(time: string | undefined): { hour: number; minute: number; label: string } {
  if (time === 'lunsj') return { hour: 12, minute: 30, label: '12:30' };
  if (time === 'kveld') return { hour: 20, minute: 0, label: '20:00' };
  return { hour: 8, minute: 0, label: '08:00' };
}

const CLOCK = /^(\d{1,2}):(\d{2})$/;

/** "8:00" / "08:00" on a 5-minute grid. Anything else is not a clock. */
export function parseClock(value: string | undefined): { hour: number; minute: number } | null {
  if (!value) return null;
  const match = CLOCK.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  const snapped = Math.round(minute / 5) * 5;
  if (snapped === 60) return { hour: (hour + 1) % 24, minute: 0 };
  return { hour, minute: snapped };
}

export function formatClock(hour: number, minute: number): string {
  return `${pad(hour)}:${pad(minute)}`;
}

/**
 * The wheel shows a saved clock when Deg has one.
 * Otherwise it uses the onboarding answer (morgen 08:00, lunsj 12:30, kveld 20:00).
 * No answer at all is 08:00.
 */
export function resolveReminderClock(
  time: string | undefined,
  clock: string | undefined,
): { hour: number; minute: number; label: string } {
  const parsed = parseClock(clock);
  if (parsed) return { ...parsed, label: formatClock(parsed.hour, parsed.minute) };
  return reminderSchedule(time);
}

const MONTH_NB = [
  'januar',
  'februar',
  'mars',
  'april',
  'mai',
  'juni',
  'juli',
  'august',
  'september',
  'oktober',
  'november',
  'desember',
] as const;

/** «Kjedet deg siden oktober 2026». Month and year are local. */
export function boredSinceLine(date: Date): string {
  const month = MONTH_NB[date.getMonth()];
  if (!month || !Number.isFinite(date.getFullYear())) return 'Kjedet deg siden';
  return `Kjedet deg siden ${month} ${date.getFullYear()}`;
}

/** Earliest valid instant, or `now` when nothing is stored yet. */
export function earliestIso(values: readonly (string | null | undefined)[], now = new Date()): string {
  let best: number | null = null;
  for (const value of values) {
    if (!value) continue;
    const ms = Date.parse(value);
    if (!Number.isFinite(ms)) continue;
    if (best === null || ms < best) best = ms;
  }
  return new Date(best ?? now.getTime()).toISOString();
}
