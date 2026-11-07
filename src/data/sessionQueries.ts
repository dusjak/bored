import type { JournalRecord, MoodId, SessionRecord, SessionStatus, SessionWithJournal } from '@/data/types';

/** The slice of a SQL connection the repository uses. Expo SQLite satisfies it. */
export type AppDatabase = {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, ...params: (string | number | null)[]): Promise<unknown>;
  getFirstAsync<T>(source: string, ...params: (string | number | null)[]): Promise<T | null>;
  getAllAsync<T>(source: string, ...params: (string | number | null)[]): Promise<T[]>;
};

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

export async function getSetting(db: AppDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
  return row?.value ?? null;
}

export async function setSetting(db: AppDatabase, key: string, value: string): Promise<void> {
  const now = nowIso();
  await db.runAsync(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    key,
    value,
    now,
  );
}

export async function listFinishedSessions(db: AppDatabase): Promise<SessionWithJournal[]> {
  const rows = await db.getAllAsync<SessionRow>(
    `SELECT ${SESSION_COLUMNS}
     FROM sessions s
     LEFT JOIN journal_entries j ON j.session_id = s.id
     WHERE s.status IN ('completed', 'aborted')
     ORDER BY s.started_at DESC`,
  );
  return rows.map((row) => ({ ...mapSession(row), journal: mapJournal(row) }));
}

/** One session and its note, or null when the id is unknown. */
export async function getSession(db: AppDatabase, id: string): Promise<SessionWithJournal | null> {
  const row = await db.getFirstAsync<SessionRow>(
    `SELECT ${SESSION_COLUMNS}
     FROM sessions s
     LEFT JOIN journal_entries j ON j.session_id = s.id
     WHERE s.id = ?`,
    id,
  );
  if (!row) return null;
  return { ...mapSession(row), journal: mapJournal(row) };
}

export async function getActiveSession(db: AppDatabase): Promise<SessionRecord | null> {
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

export async function insertActiveSession(db: AppDatabase, minutes: number): Promise<SessionRecord> {
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
  const created = await getActiveSession(db);
  if (!created || created.id !== id) throw new Error('Could not read the session that was just started');
  return created;
}

export async function setNotificationId(db: AppDatabase, id: string, notificationId: string | null): Promise<void> {
  await db.runAsync('UPDATE sessions SET notification_id = ?, updated_at = ? WHERE id = ?', notificationId, nowIso(), id);
}

export async function markBackgrounded(db: AppDatabase, id: string, at: Date): Promise<void> {
  const stamp = nowIso(at);
  await db.runAsync(
    `UPDATE sessions SET backgrounded_at = ?, updated_at = ? WHERE id = ? AND status = 'active'`,
    stamp,
    stamp,
    id,
  );
}

export async function clearBackgrounded(db: AppDatabase, id: string): Promise<void> {
  await db.runAsync(
    `UPDATE sessions SET backgrounded_at = NULL, updated_at = ? WHERE id = ? AND status = 'active'`,
    nowIso(),
    id,
  );
}

export async function finishSession(
  db: AppDatabase,
  id: string,
  status: 'completed' | 'aborted',
  actualDurationSeconds: number,
  endedAt: Date,
): Promise<void> {
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

export async function upsertJournal(db: AppDatabase, sessionId: string, mood: MoodId | null, note: string): Promise<void> {
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

export async function deleteJournal(db: AppDatabase, sessionId: string): Promise<void> {
  await db.runAsync('DELETE FROM journal_entries WHERE session_id = ?', sessionId);
}

/** Deletes the session and its note. Other sessions are left alone. */
export async function deleteSession(db: AppDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM journal_entries WHERE session_id = ?', id);
  await db.runAsync('DELETE FROM sessions WHERE id = ?', id);
}

/**
 * True when this install already has sessions, notes, app state, or any setting
 * other than the countdown key. Does not write and does not delete.
 */
export async function hasPriorUserData(db: AppDatabase, countdownKey: string): Promise<boolean> {
  const row = await db.getFirstAsync<{ present: number }>(
    `SELECT 1 AS present FROM sessions
     UNION ALL SELECT 1 FROM journal_entries
     UNION ALL SELECT 1 FROM app_state
     UNION ALL SELECT 1 FROM settings WHERE key != ?
     LIMIT 1`,
    countdownKey,
  );
  return row != null;
}

/**
 * Oldest stored instant. Sessions and settings both count.
 * Empty tables return null. Does not write.
 */
export async function earliestStoredUse(db: AppDatabase): Promise<string | null> {
  const row = await db.getFirstAsync<{ iso: string | null }>(`
    SELECT MIN(iso) AS iso FROM (
      SELECT MIN(started_at) AS iso FROM sessions
      UNION ALL
      SELECT MIN(updated_at) AS iso FROM settings
    )
  `);
  return row?.iso ?? null;
}

/** Wipes sessions, notes, settings, and app_state. The next launch looks newly installed. */
export async function clearAllLocalData(db: AppDatabase): Promise<void> {
  await db.runAsync('DELETE FROM journal_entries');
  await db.runAsync('DELETE FROM sessions');
  await db.runAsync('DELETE FROM settings');
  await db.runAsync('DELETE FROM app_state');
}

/** Oldest first, one mark per finished session. Aborted marks use the muted stroke. */
export function tallyMarks(sessions: { status: SessionStatus; startedAt: string }[]): { aborted: boolean }[] {
  return sessions
    .filter((session) => session.status === 'completed' || session.status === 'aborted')
    .slice()
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .map((session) => ({ aborted: session.status === 'aborted' }));
}

/** Counts behind the Logg header. Active rows are not part of the log. */
export function sessionTotals(sessions: { status: SessionStatus }[]): {
  total: number;
  completed: number;
  aborted: number;
} {
  let completed = 0;
  let aborted = 0;
  for (const session of sessions) {
    if (session.status === 'completed') completed += 1;
    else if (session.status === 'aborted') aborted += 1;
  }
  return { total: completed + aborted, completed, aborted };
}
