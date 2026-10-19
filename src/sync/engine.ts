import { nowIso, type AppDatabase } from '../data/sessionQueries.ts';
import { isUuid } from '../data/ids.ts';
import { planRow } from './merge.ts';
import {
  BOUND_USER_KEY,
  PROFILE_SETTING_KEY,
  displayNameFromProfile,
  isMood,
  isSyncedSettingKey,
  type RemoteSession,
  type RemoteSetting,
  type SyncGate,
  type SyncReport,
  type SyncTransport,
} from './model.ts';

type LocalSession = RemoteSession;

type DeletedSession = {
  id: string;
  chosenDurationSeconds: number;
  actualDurationSeconds: number;
  status: RemoteSession['status'];
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
  journal: { mood: string | null; note: string } | null;
};

/**
 * Records a finished session that was removed on this device.
 * Active sessions are not backed up, so they do not need a tombstone.
 * The new stamp is "now", which is what makes the delete win last-write-wins.
 */
export async function rememberDeletedSession(db: AppDatabase, session: DeletedSession): Promise<void> {
  if (session.status === 'active') return;
  if (!isUuid(session.id)) return;
  const deletedAt = nowIso();
  const payload: RemoteSession = {
    id: session.id,
    chosenDurationSeconds: session.chosenDurationSeconds,
    actualDurationSeconds: session.actualDurationSeconds,
    status: session.status,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    mood: isMood(session.journal?.mood) ? session.journal.mood : null,
    note: session.journal?.note ?? '',
    createdAt: session.createdAt,
    updatedAt: deletedAt,
    deletedAt,
  };
  await db.runAsync(
    `INSERT INTO sync_tombstones (entity, entity_id, updated_at, deleted_at, payload)
     VALUES ('session', ?, ?, ?, ?)
     ON CONFLICT(entity, entity_id) DO UPDATE SET
       updated_at = excluded.updated_at,
       deleted_at = excluded.deleted_at,
       payload = excluded.payload`,
    session.id,
    deletedAt,
    deletedAt,
    JSON.stringify(payload),
  );
}

/**
 * One sync pass. Disabled and signed-out return before any read or network call.
 * The device database stays the source of truth; this only reconciles copies.
 */
export async function syncWithTransport(
  db: AppDatabase,
  transport: SyncTransport,
  gate: SyncGate,
): Promise<SyncReport> {
  if (gate.mode === 'disabled') return { status: 'disabled' };
  if (gate.mode === 'signed-out') return { status: 'signed-out' };

  const bound = await getState(db, BOUND_USER_KEY);
  if (bound && bound !== gate.userId) {
    return { status: 'account-mismatch', localUserId: bound, remoteUserId: gate.userId };
  }

  const remoteSessions = await transport.pullSessions();
  const remoteSettings = await transport.pullSettings();
  const localSessions = indexSessions(await readLocalSessions(db), await readTombstones(db));
  const localSettings = await readLocalSettings(db);

  const sessionPlans = planSessions(localSessions, remoteSessions);
  const settingPlans = planSettings(localSettings, remoteSettings);

  if (!bound) await setState(db, BOUND_USER_KEY, gate.userId);

  for (const row of sessionPlans.apply) {
    if (row.deletedAt) await deleteLocalSession(db, row.id);
    else await upsertLocalSession(db, row);
    await deleteTombstone(db, row.id);
  }
  for (const row of settingPlans.apply) {
    if (row.deletedAt) await db.runAsync('DELETE FROM settings WHERE key = ?', row.key);
    else await upsertLocalSetting(db, row);
  }

  if (sessionPlans.push.length > 0) await transport.upsertSessions(sessionPlans.push);
  if (settingPlans.push.length > 0) await transport.upsertSettings(settingPlans.push);

  const pushedProfile = settingPlans.push.find((row) => row.key === PROFILE_SETTING_KEY);
  if (pushedProfile && pushedProfile.deletedAt == null) {
    await transport.upsertProfile({
      displayName: displayNameFromProfile(pushedProfile.value),
      updatedAt: pushedProfile.updatedAt,
    });
  }

  for (const row of sessionPlans.push) {
    if (row.deletedAt) await deleteTombstone(db, row.id);
  }

  return {
    status: 'synced',
    pushed: sessionPlans.push.length + settingPlans.push.length,
    applied: sessionPlans.apply.length + settingPlans.apply.length,
    userId: gate.userId,
  };
}

function planSessions(localSessions: Map<string, LocalSession>, remoteSessions: RemoteSession[]) {
  const remoteById = new Map(remoteSessions.map((row) => [row.id, row]));
  const apply: RemoteSession[] = [];
  const push: RemoteSession[] = [];
  const ids = new Set<string>([...localSessions.keys(), ...remoteById.keys()]);
  for (const id of ids) {
    const local = localSessions.get(id) ?? null;
    const remote = remoteById.get(id) ?? null;
    const holdLocal = local != null && local.deletedAt == null && local.status === 'active';
    const plan = planRow(local, remote, { holdLocal });
    const remoteInProgress = remote != null && remote.deletedAt == null && remote.status === 'active';
    if (plan.applyRemote && remote && !remoteInProgress) apply.push(remote);
    if (plan.pushLocal && local) push.push(local);
  }
  return { apply, push };
}

function planSettings(localSettings: RemoteSetting[], remoteSettings: RemoteSetting[]) {
  const localByKey = new Map(localSettings.map((row) => [row.key, row]));
  const remoteByKey = new Map(remoteSettings.filter((row) => isSyncedSettingKey(row.key)).map((row) => [row.key, row]));
  const apply: RemoteSetting[] = [];
  const push: RemoteSetting[] = [];
  const keys = new Set<string>([...localByKey.keys(), ...remoteByKey.keys()]);
  for (const key of keys) {
    const local = localByKey.get(key) ?? null;
    const remote = remoteByKey.get(key) ?? null;
    const plan = planRow(local, remote);
    if (plan.applyRemote && remote) apply.push(remote);
    if (plan.pushLocal && local) push.push(local);
  }
  return { apply, push };
}

function indexSessions(live: LocalSession[], tombs: LocalSession[]): Map<string, LocalSession> {
  const byId = new Map<string, LocalSession>();
  for (const row of live) byId.set(row.id, row);
  for (const tomb of tombs) {
    const existing = byId.get(tomb.id);
    if (!existing || Date.parse(tomb.updatedAt) >= Date.parse(existing.updatedAt)) byId.set(tomb.id, tomb);
  }
  return byId;
}

type SessionQueryRow = {
  id: string;
  chosen_duration_seconds: number;
  actual_duration_seconds: number;
  status: string;
  started_at: string;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
  mood: string | null;
  note: string | null;
  journal_updated_at: string | null;
};

async function readLocalSessions(db: AppDatabase): Promise<LocalSession[]> {
  const rows = await db.getAllAsync<SessionQueryRow>(
    `SELECT s.id, s.chosen_duration_seconds, s.actual_duration_seconds, s.status,
            s.started_at, s.ended_at, s.created_at, s.updated_at,
            j.mood, j.note, j.updated_at AS journal_updated_at
     FROM sessions s
     LEFT JOIN journal_entries j ON j.session_id = s.id`,
  );
  return rows.flatMap((row) => {
    if (row.status !== 'active' && row.status !== 'completed' && row.status !== 'aborted') return [];
    if (!isUuid(row.id)) return [];
    const updatedAt = laterIso(row.updated_at, row.journal_updated_at);
    return [
      {
        id: row.id,
        chosenDurationSeconds: row.chosen_duration_seconds,
        actualDurationSeconds: row.actual_duration_seconds,
        status: row.status,
        startedAt: row.started_at,
        endedAt: row.ended_at,
        mood: isMood(row.mood) ? row.mood : null,
        note: row.note ?? '',
        createdAt: row.created_at,
        updatedAt,
        deletedAt: null,
      },
    ];
  });
}

async function readTombstones(db: AppDatabase): Promise<LocalSession[]> {
  const rows = await db.getAllAsync<{ payload: string }>(
    `SELECT payload FROM sync_tombstones WHERE entity = 'session'`,
  );
  const parsed: LocalSession[] = [];
  for (const row of rows) {
    try {
      const value = JSON.parse(row.payload) as LocalSession;
      if (!value || typeof value.id !== 'string' || !isUuid(value.id)) continue;
      parsed.push(value);
    } catch {
      // Skip a tombstone we cannot read. The session is already gone locally.
    }
  }
  return parsed;
}

async function readLocalSettings(db: AppDatabase): Promise<RemoteSetting[]> {
  const rows = await db.getAllAsync<{ key: string; value: string; updated_at: string }>(
    'SELECT key, value, updated_at FROM settings',
  );
  return rows
    .filter((row) => isSyncedSettingKey(row.key))
    .map((row) => ({ key: row.key, value: row.value, updatedAt: row.updated_at, deletedAt: null }));
}

async function upsertLocalSession(db: AppDatabase, row: RemoteSession): Promise<void> {
  await db.runAsync(
    `INSERT INTO sessions (
       id, chosen_duration_seconds, actual_duration_seconds, status,
       started_at, ended_at, backgrounded_at, notification_id, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       chosen_duration_seconds = excluded.chosen_duration_seconds,
       actual_duration_seconds = excluded.actual_duration_seconds,
       status = excluded.status,
       started_at = excluded.started_at,
       ended_at = excluded.ended_at,
       created_at = excluded.created_at,
       updated_at = excluded.updated_at,
       notification_id = CASE WHEN excluded.status = 'active' THEN sessions.notification_id ELSE NULL END,
       backgrounded_at = CASE WHEN excluded.status = 'active' THEN sessions.backgrounded_at ELSE NULL END`,
    row.id,
    row.chosenDurationSeconds,
    row.actualDurationSeconds,
    row.status,
    row.startedAt,
    row.endedAt,
    row.createdAt,
    row.updatedAt,
  );
  if (row.note === '' && row.mood == null) {
    await db.runAsync('DELETE FROM journal_entries WHERE session_id = ?', row.id);
    return;
  }
  await db.runAsync(
    `INSERT INTO journal_entries (id, session_id, mood, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(session_id) DO UPDATE SET
       mood = excluded.mood,
       note = excluded.note,
       updated_at = excluded.updated_at`,
    row.id,
    row.id,
    row.mood,
    row.note,
    row.updatedAt,
    row.updatedAt,
  );
}

async function deleteLocalSession(db: AppDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM journal_entries WHERE session_id = ?', id);
  await db.runAsync('DELETE FROM sessions WHERE id = ?', id);
}

async function deleteTombstone(db: AppDatabase, id: string): Promise<void> {
  await db.runAsync(`DELETE FROM sync_tombstones WHERE entity = 'session' AND entity_id = ?`, id);
}

async function upsertLocalSetting(db: AppDatabase, row: RemoteSetting): Promise<void> {
  if (!isSyncedSettingKey(row.key)) return;
  await db.runAsync(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    row.key,
    row.value,
    row.updatedAt,
  );
}

async function getState(db: AppDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM sync_state WHERE key = ?', key);
  return row?.value ?? null;
}

async function setState(db: AppDatabase, key: string, value: string): Promise<void> {
  await db.runAsync(
    `INSERT INTO sync_state (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    key,
    value,
  );
}

function laterIso(left: string, right: string | null): string {
  if (!right) return left;
  return Date.parse(right) > Date.parse(left) ? right : left;
}
