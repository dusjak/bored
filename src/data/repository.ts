import { openDatabase } from '@/data/db';
import type { AppDatabase } from '@/data/sessionQueries';
import * as queries from '@/data/sessionQueries';
import type { MoodId, OnboardingProfile, SessionRecord, SessionWithJournal } from '@/data/types';

export const THEME_PREFERENCE_KEY = 'bored.themePreference';
export const DURATION_KEY = 'bored.defaultDurationMinutes';
export const ONBOARDED_KEY = 'bored.onboarded';
export const PROFILE_KEY = 'bored.profile';
export const SHOW_COUNTDOWN_KEY = 'bored.showCountdown';
export const SPLASH_SEEN_KEY = 'bored.splashSeen';

function connection(db: Awaited<ReturnType<typeof openDatabase>>): AppDatabase {
  return db as unknown as AppDatabase;
}

export async function initDatabase(): Promise<void> {
  await openDatabase();
}

export async function getSetting(key: string): Promise<string | null> {
  return queries.getSetting(connection(await openDatabase()), key);
}

export async function setSetting(key: string, value: string): Promise<void> {
  await queries.setSetting(connection(await openDatabase()), key, value);
}

export async function getProfile(): Promise<OnboardingProfile> {
  const raw = await getSetting(PROFILE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as OnboardingProfile;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export async function saveProfile(profile: OnboardingProfile): Promise<void> {
  await setSetting(PROFILE_KEY, JSON.stringify(profile));
}

export async function listFinishedSessions(): Promise<SessionWithJournal[]> {
  return queries.listFinishedSessions(connection(await openDatabase()));
}

/** One session and the note attached to it. */
export async function getSession(id: string): Promise<SessionWithJournal | null> {
  return queries.getSession(connection(await openDatabase()), id);
}

export async function getActiveSession(): Promise<SessionRecord | null> {
  return queries.getActiveSession(connection(await openDatabase()));
}

export async function insertActiveSession(minutes: number): Promise<SessionRecord> {
  return queries.insertActiveSession(connection(await openDatabase()), minutes);
}

export async function setNotificationId(id: string, notificationId: string | null): Promise<void> {
  await queries.setNotificationId(connection(await openDatabase()), id, notificationId);
}

export async function markBackgrounded(id: string, at: Date): Promise<void> {
  await queries.markBackgrounded(connection(await openDatabase()), id, at);
}

export async function clearBackgrounded(id: string): Promise<void> {
  await queries.clearBackgrounded(connection(await openDatabase()), id);
}

export async function finishSession(
  id: string,
  status: 'completed' | 'aborted',
  actualDurationSeconds: number,
  endedAt: Date,
): Promise<void> {
  await queries.finishSession(connection(await openDatabase()), id, status, actualDurationSeconds, endedAt);
}

export async function upsertJournal(sessionId: string, mood: MoodId | null, note: string): Promise<void> {
  await queries.upsertJournal(connection(await openDatabase()), sessionId, mood, note);
}

export async function deleteJournal(sessionId: string): Promise<void> {
  await queries.deleteJournal(connection(await openDatabase()), sessionId);
}

/** Deletes the session row and its note. */
export async function deleteSession(id: string): Promise<void> {
  await queries.deleteSession(connection(await openDatabase()), id);
}

/** Deletes every session, note, and setting. Does not touch the OS notification permission. */
export async function clearAllLocalData(): Promise<void> {
  await queries.clearAllLocalData(connection(await openDatabase()));
}
