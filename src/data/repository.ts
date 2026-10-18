import { openDatabase } from '@/data/db';
import type { JournalRecord, MoodId, OnboardingProfile, SessionRecord, SessionStatus, SessionWithJournal } from '@/data/types';

export const THEME_PREFERENCE_KEY = 'bored.themePreference';
export const DURATION_KEY = 'bored.defaultDurationMinutes';
export const ONBOARDED_KEY = 'bored.onboarded';
export const PROFILE_KEY = 'bored.profile';

type SessionRow = {
  id: string;
  chosen_duration_seconds: number;
  actual_duration_seconds: number;
  status: string;
  started_at: string;
  ended_at: string | null;
  backgrounded_at: string | null;
  notification_id: string | null;
  created_at: string;
  updated_at: string;
  journal_id: string | null;
  mood: string | null;
  note: string | null;
  journal_created_at: string | null;
  journal_updated_at: string | null;
};

const MOOD_IDS: readonly MoodId[] = ['restless', 'neutral', 'calm', 'clear', 'deep'];

function isMood(value: string | null): value is MoodId {
  return value != null && (MOOD_IDS as readonly string[]).includes(value);
}

function isStatus(value: string): value is SessionStatus {
  return value === 'active' || value === 'completed' || value === 'aborted';
}

export function createId(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') return cryptoApi.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = Math.floor(Math.random() * 16);
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function nowIso(date = new Date()): string {
  return date.toISOString();
}

function mapSession(row: SessionRow): SessionRecord {
  if (!isStatus(row.status)) throw new Error(`Unknown session status: ${row.status}`);
  return {
    id: row.id,
    chosenDurationSeconds: row.chosen_duration_seconds,
    actualDurationSeconds: row.actual_duration_seconds,
    status: row.status,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    backgroundedAt: row.backgrounded_at,
    notificationId: row.notification_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapJournal(row: SessionRow): JournalRecord | null {
  if (!row.journal_id || !row.journal_created_at || !row.journal_updated_at) return null;
  return {
    id: row.journal_id,
    sessionId: row.id,
    mood: isMood(row.mood) ? row.mood : null,
    note: row.note ?? '',
    createdAt: row.journal_created_at,
    updatedAt: row.journal_updated_at,
  };
}

const SESSION_COLUMNS = `
  s.id, s.chosen_duration_seconds, s.actual_duration_seconds, s.status,
  s.started_at, s.ended_at, s.backgrounded_at, s.notification_id,
  s.created_at, s.updated_at,
  j.id AS journal_id, j.mood, j.note,
  j.created_at AS journal_created_at, j.updated_at AS journal_updated_at
`;

export async function initDatabase(): Promise<void> {
  await openDatabase();
}

export async function getSetting(key: string): Promise<string | null> {
  const db = await openDatabase();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await openDatabase();
  const now = nowIso();
  await db.runAsync(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    key,
    value,
    now,
  );
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
  const db = await openDatabase();
  const rows = await db.getAllAsync<SessionRow>(
    `SELECT ${SESSION_COLUMNS}
     FROM sessions s
     LEFT JOIN journal_entries j ON j.session_id = s.id
     WHERE s.status IN ('completed', 'aborted')
     ORDER BY s.started_at DESC`,
  );
  return rows.map((row) => ({ ...mapSession(row), journal: mapJournal(row) }));
}

export async function getActiveSession(): Promise<SessionRecord | null> {
  const db = await openDatabase();
  const row = await db.getFirstAsync<SessionRow>(
    `SELECT ${SESSION_COLUMNS}
     FROM sessions s
     LEFT JOIN journal_entries j ON j.session_id = s.id
     WHERE s.status = 'active'
     ORDER BY s.started_at DESC
     LIMIT 1`,
  );
  return row ? mapSession(row) : null;
}

export async function insertActiveSession(minutes: number): Promise<SessionRecord> {
  const db = await openDatabase();
  const id = createId();
  const now = nowIso();
  await db.runAsync(
    `INSERT INTO sessions (
      id, chosen_duration_seconds, actual_duration_seconds, status,
      started_at, ended_at, backgrounded_at, notification_id, created_at, updated_at
    ) VALUES (?, ?, 0, 'active', ?, NULL, NULL, NULL, ?, ?)`,
    id,
    Math.round(minutes * 60),
    now,
    now,
    now,
  );
  const created = await getActiveSession();
  if (!created || created.id !== id) throw new Error('Could not read the session that was just started');
  return created;
}

export async function setNotificationId(id: string, notificationId: string | null): Promise<void> {
  const db = await openDatabase();
  await db.runAsync('UPDATE sessions SET notification_id = ?, updated_at = ? WHERE id = ?', notificationId, nowIso(), id);
}

export async function markBackgrounded(id: string, at: Date): Promise<void> {
  const db = await openDatabase();
  const stamp = nowIso(at);
  await db.runAsync(
    `UPDATE sessions SET backgrounded_at = ?, updated_at = ? WHERE id = ? AND status = 'active'`,
    stamp,
    stamp,
    id,
  );
}

export async function clearBackgrounded(id: string): Promise<void> {
  const db = await openDatabase();
  await db.runAsync(
    `UPDATE sessions SET backgrounded_at = NULL, updated_at = ? WHERE id = ? AND status = 'active'`,
    nowIso(),
    id,
  );
}

export async function finishSession(
  id: string,
  status: 'completed' | 'aborted',
  actualDurationSeconds: number,
  endedAt: Date,
): Promise<void> {
  const db = await openDatabase();
  await db.runAsync(
    `UPDATE sessions
     SET status = ?, actual_duration_seconds = ?, ended_at = ?, notification_id = NULL, updated_at = ?
     WHERE id = ? AND status = 'active'`,
    status,
    Math.max(0, Math.round(actualDurationSeconds)),
    nowIso(endedAt),
    nowIso(),
    id,
  );
}

export async function upsertJournal(sessionId: string, mood: MoodId | null, note: string): Promise<void> {
  const db = await openDatabase();
  const now = nowIso();
  await db.runAsync(
    `INSERT INTO journal_entries (id, session_id, mood, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(session_id) DO UPDATE SET
       mood = excluded.mood,
       note = excluded.note,
       updated_at = excluded.updated_at`,
    createId(),
    sessionId,
    mood,
    note,
    now,
    now,
  );
}

export async function deleteJournal(sessionId: string): Promise<void> {
  const db = await openDatabase();
  await db.runAsync('DELETE FROM journal_entries WHERE session_id = ?', sessionId);
}
