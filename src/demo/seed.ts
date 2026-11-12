import {
  createId,
  deleteSession,
  getActiveSession,
  listFinishedSessions,
  setSetting,
  upsertJournal,
  type AppDatabase,
} from '../data/sessionQueries.ts';
import { FIRST_USED_TRUSTED_KEY } from '../data/sinceLine.ts';
import type { MoodId } from '../data/types.ts';

/** Same keys as `src/data/repository.ts`. Kept here so the seed does not load Expo SQLite. */
const ONBOARDED_KEY = 'bored.onboarded';
const THEME_PREFERENCE_KEY = 'bored.themePreference';
const DURATION_KEY = 'bored.defaultDurationMinutes';
const PROFILE_KEY = 'bored.profile';

/** True only in a dev bundle. Production and TestFlight stay false, so the seed never runs. */
export function shouldRunDemoSeed(dev: boolean | undefined): boolean {
  return dev === true;
}

function devFlag(): boolean | undefined {
  return typeof __DEV__ === 'undefined' ? undefined : __DEV__;
}

type DemoStatus = 'completed' | 'aborted';

type DemoSession = {
  daysAgo: number;
  minutes: 5 | 10 | 15 | 20;
  status: DemoStatus;
  actualSeconds: number;
  note: string | null;
  mood: MoodId | null;
};

const NOTES = [
  'Tenkte på ingenting. Det var godt.',
  'Hodet ble roligere mot slutten.',
  'Tankene vandret til barndomshjemmet.',
  'En drøm fra for mange år siden.',
  'Ingenting. Og det var greit.',
] as const;

/** Fourteen sessions across about three weeks. Three end early. Five carry a note. */
export function demoSessions(): DemoSession[] {
  return [
    { daysAgo: 20, minutes: 10, status: 'completed', actualSeconds: 600, note: NOTES[0], mood: 'calm' },
    { daysAgo: 18, minutes: 5, status: 'completed', actualSeconds: 300, note: null, mood: null },
    { daysAgo: 17, minutes: 15, status: 'aborted', actualSeconds: 42, note: null, mood: null },
    { daysAgo: 16, minutes: 20, status: 'completed', actualSeconds: 1200, note: NOTES[1], mood: 'clear' },
    { daysAgo: 14, minutes: 10, status: 'completed', actualSeconds: 600, note: null, mood: 'neutral' },
    { daysAgo: 13, minutes: 5, status: 'completed', actualSeconds: 300, note: NOTES[4], mood: 'calm' },
    { daysAgo: 11, minutes: 10, status: 'aborted', actualSeconds: 88, note: null, mood: null },
    { daysAgo: 9, minutes: 15, status: 'completed', actualSeconds: 900, note: NOTES[2], mood: 'deep' },
    { daysAgo: 8, minutes: 20, status: 'completed', actualSeconds: 1200, note: null, mood: null },
    { daysAgo: 6, minutes: 10, status: 'completed', actualSeconds: 600, note: null, mood: 'restless' },
    { daysAgo: 5, minutes: 5, status: 'aborted', actualSeconds: 130, note: null, mood: null },
    { daysAgo: 3, minutes: 10, status: 'completed', actualSeconds: 600, note: NOTES[3], mood: 'neutral' },
    { daysAgo: 2, minutes: 15, status: 'completed', actualSeconds: 900, note: null, mood: null },
    { daysAgo: 1, minutes: 10, status: 'completed', actualSeconds: 600, note: null, mood: 'calm' },
  ];
}

function atDaysAgo(now: Date, daysAgo: number): Date {
  const day = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  day.setUTCHours(18, 0, 0, 0);
  return day;
}

/** Replaces sessions and the launch settings. Does nothing until the caller has checked the dev gate. */
export async function applyDemoSeed(db: AppDatabase, now: Date): Promise<void> {
  const finished = await listFinishedSessions(db);
  for (const session of finished) await deleteSession(db, session.id);
  const active = await getActiveSession(db);
  if (active) await deleteSession(db, active.id);

  let oldest = now.toISOString();
  for (const item of demoSessions()) {
    const id = createId();
    const started = atDaysAgo(now, item.daysAgo);
    const ended = new Date(started.getTime() + item.actualSeconds * 1000);
    const startedIso = started.toISOString();
    const endedIso = ended.toISOString();
    if (startedIso < oldest) oldest = startedIso;
    await db.runAsync(
      `INSERT INTO sessions (
        id, chosen_duration_seconds, actual_duration_seconds, status,
        started_at, ended_at, backgrounded_at, notification_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)`,
      id,
      item.minutes * 60,
      item.actualSeconds,
      item.status,
      startedIso,
      endedIso,
      startedIso,
      endedIso,
    );
    if (item.note || item.mood) await upsertJournal(db, id, item.mood, item.note ?? '');
  }

  await setSetting(db, ONBOARDED_KEY, '1');
  await setSetting(db, THEME_PREFERENCE_KEY, 'light');
  await setSetting(db, DURATION_KEY, '10');
  await setSetting(db, PROFILE_KEY, JSON.stringify({ duration: '10' }));
  await setSetting(db, FIRST_USED_TRUSTED_KEY, oldest);
}

/**
 * Dev-only. Returns false without touching storage when `__DEV__` is not true.
 * The false branch is what a production or TestFlight bundle keeps.
 */
export async function seedDemoData(dev: boolean | undefined = devFlag()): Promise<boolean> {
  if (!shouldRunDemoSeed(dev)) return false;
  const { openDatabase } = await import('@/data/db');
  const db = (await openDatabase()) as unknown as AppDatabase;
  await applyDemoSeed(db, new Date());
  return true;
}
