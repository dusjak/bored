import { EMPTY_NUDGE, nudgeAfterDismiss, type NudgeFlags } from '../backup/nudge.ts';
import { EMPTY_PREVIEW, parseBackupPreview, type BackupPreview } from '../backup/model.ts';
import type { AppDatabase } from './sessionQueries.ts';

/** Local keys. They live in `app_state`, not `settings`, and are not synced. */
export const NUDGE_DISMISS_COUNT_KEY = 'backupNudgeDismissCount';
export const NUDGE_DISMISSED_AT_SESSIONS_KEY = 'backupNudgeDismissedAtSessions';
export const NUDGE_DISMISSED_AT_KEY = 'backupNudgeDismissedAt';
export const BACKUP_EVER_ENABLED_KEY = 'backupEverEnabled';
export const BACKUP_PREVIEW_KEY = 'backupPreview';

/** v0.3 names. Read once so a leftover row cannot drive the new rule, then deleted. */
export const LEGACY_NUDGE_KEYS = ['backupNudgeShownAt', 'backupNudgeDismissed', 'backupNudgeRemindedAt'] as const;

async function readValue(db: AppDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_state WHERE key = ?', key);
  return row?.value ?? null;
}

async function writeValue(db: AppDatabase, key: string, value: string): Promise<void> {
  await db.runAsync(
    `INSERT INTO app_state (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    key,
    value,
  );
}

function clampDismissCount(raw: string | null): number {
  const n = raw == null ? 0 : parseInt(raw, 10);
  if (n === 1) return 1;
  if (Number.isFinite(n) && n >= 2) return 2;
  return 0;
}

export async function readNudgeFlags(db: AppDatabase): Promise<NudgeFlags> {
  const [count, atSessions, at, ever] = await Promise.all([
    readValue(db, NUDGE_DISMISS_COUNT_KEY),
    readValue(db, NUDGE_DISMISSED_AT_SESSIONS_KEY),
    readValue(db, NUDGE_DISMISSED_AT_KEY),
    readValue(db, BACKUP_EVER_ENABLED_KEY),
  ]);
  const parsedSessions = atSessions == null ? null : parseInt(atSessions, 10);
  return {
    dismissCount: clampDismissCount(count),
    dismissedAtSessions: parsedSessions != null && Number.isFinite(parsedSessions) ? parsedSessions : null,
    dismissedAt: at,
    everEnabled: ever === '1',
  };
}

export async function writeNudgeFlags(db: AppDatabase, flags: NudgeFlags): Promise<void> {
  await writeValue(db, NUDGE_DISMISS_COUNT_KEY, String(flags.dismissCount));
  if (flags.dismissedAtSessions == null) {
    await db.runAsync('DELETE FROM app_state WHERE key = ?', NUDGE_DISMISSED_AT_SESSIONS_KEY);
  } else {
    await writeValue(db, NUDGE_DISMISSED_AT_SESSIONS_KEY, String(flags.dismissedAtSessions));
  }
  if (flags.dismissedAt == null) {
    await db.runAsync('DELETE FROM app_state WHERE key = ?', NUDGE_DISMISSED_AT_KEY);
  } else {
    await writeValue(db, NUDGE_DISMISSED_AT_KEY, flags.dismissedAt);
  }
  if (flags.everEnabled) await writeValue(db, BACKUP_EVER_ENABLED_KEY, '1');
  else await db.runAsync('DELETE FROM app_state WHERE key = ?', BACKUP_EVER_ENABLED_KEY);
}

export async function dismissNudgeFlags(db: AppDatabase, completed: number, dismissedAt: string): Promise<NudgeFlags> {
  const next = nudgeAfterDismiss(await readNudgeFlags(db), completed, dismissedAt);
  await writeNudgeFlags(db, next);
  return next;
}

export async function setBackupEverEnabled(db: AppDatabase): Promise<void> {
  await writeValue(db, BACKUP_EVER_ENABLED_KEY, '1');
}

export async function readBackupEverEnabled(db: AppDatabase): Promise<boolean> {
  return (await readValue(db, BACKUP_EVER_ENABLED_KEY)) === '1';
}

export async function readBackupPreview(db: AppDatabase): Promise<BackupPreview> {
  return parseBackupPreview(await readValue(db, BACKUP_PREVIEW_KEY));
}

export async function writeBackupPreview(db: AppDatabase, preview: BackupPreview): Promise<void> {
  await writeValue(db, BACKUP_PREVIEW_KEY, JSON.stringify(preview));
}

export async function purgeLegacyNudgeFlags(db: AppDatabase): Promise<void> {
  for (const key of LEGACY_NUDGE_KEYS) {
    await db.runAsync('DELETE FROM app_state WHERE key = ?', key);
  }
}

export { EMPTY_NUDGE, EMPTY_PREVIEW };
