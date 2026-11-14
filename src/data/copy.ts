import type { OnboardingProfile } from '@/data/types';

export const PRESET_MINUTES = [5, 10, 15, 20] as const;
export const MIN_CUSTOM_MINUTES = 5;
export const MAX_CUSTOM_MINUTES = 20;
export const DEFAULT_DURATION_MINUTES = 10;
/**
 * Hold-to-end length. 150 ms entrance, then 4.0 s of fill: 4.15 s total.
 * Phase and haptic marks are 1.45 s, 2.85 s and 4.15 s.
 */
export const HOLD_TO_END_MS = 4150;

/**
 * Placeholder lines for the hold, in phase order, then the completed line.
 * UX copy review owns the wording. Keep every session hold string here.
 */
export const HOLD_PHASE_TEXT = ['Hold for å avslutte', 'Fortsett å holde …', 'Litt til …'] as const;
export const HOLD_DONE_TEXT = 'Avsluttet';
export const HOLD_A11Y_LABEL = 'Avslutt økt';
export const HOLD_A11Y_HINT = 'Dobbelttrykk for å avslutte';
export const HOLD_CONFIRM_TITLE = 'Avslutte økten?';
export const HOLD_CONFIRM_END = 'Avslutt';
export const HOLD_CONFIRM_CONTINUE = 'Fortsett';
/** Visible word above the session clock. The accessibility label uses the same word. */
export const REMAINING_LABEL = 'gjenstår';

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

/**
 * Lock-hint copy. Placeholders pending UX copy review — keep every variant here.
 * The notification line promises a local alert, so it is only true when permission is granted.
 */
export const LOCK_HINT_WITH_NOTIFICATION = 'Lås skjermen, vi gir deg\net varsel når tiden har gått ut.';

/** Used when notification permission is missing. Does not promise an alert. */
export const LOCK_HINT_WITHOUT_NOTIFICATION = 'Lås skjermen. Økten går\nvidere i bakgrunnen.';

export function lockHintCopy(notificationsGranted: boolean): string {
  return notificationsGranted ? LOCK_HINT_WITH_NOTIFICATION : LOCK_HINT_WITHOUT_NOTIFICATION;
}

/** One sentence for VoiceOver. The on-screen copy may break across two lines. */
export function lockHintSpeech(notificationsGranted: boolean): string {
  return lockHintCopy(notificationsGranted).replace('\n', ' ');
}

/** Clock for the daily reminder. An unset or varying time uses 08:00. */
export function reminderSchedule(time: string | undefined): { hour: number; minute: number; label: string } {
  if (time === 'lunsj') return { hour: 12, minute: 30, label: '12:30' };
  if (time === 'kveld') return { hour: 20, minute: 0, label: '20:00' };
  return { hour: 8, minute: 0, label: '08:00' };
}

const CLOCK = /^(\d{1,2}):(\d{2})$/;

/** "8:00" / "08:00", with the minute kept as saved (00–59). Anything else is not a clock. */
export function parseClock(value: string | undefined): { hour: number; minute: number } | null {
  if (!value) return null;
  const match = CLOCK.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
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
