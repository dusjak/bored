import { isUuid } from './ids.ts';
import { createId, type AppDatabase } from './sessionQueries.ts';

export type IdMigrationResult = {
  sessions: number;
  notes: number;
};

/**
 * Rewrites session and note ids that are not UUIDs. Current builds already
 * mint UUIDs, so this is a no-op until it meets an older row. Settings keys
 * stay as they are; they are names, not row ids.
 */
export async function migrateLegacyIds(db: AppDatabase): Promise<IdMigrationResult> {
  const result: IdMigrationResult = { sessions: 0, notes: 0 };
  await db.execAsync('PRAGMA foreign_keys = OFF');
  try {
    const sessions = await db.getAllAsync<{ id: string }>('SELECT id FROM sessions');
    for (const row of sessions) {
      if (isUuid(row.id)) continue;
      const next = createId();
      await db.runAsync('UPDATE journal_entries SET session_id = ? WHERE session_id = ?', next, row.id);
      await db.runAsync(
        `UPDATE sync_tombstones SET entity_id = ? WHERE entity = 'session' AND entity_id = ?`,
        next,
        row.id,
      );
      await rewriteTombstonePayload(db, next, row.id);
      await db.runAsync('UPDATE sessions SET id = ? WHERE id = ?', next, row.id);
      result.sessions += 1;
    }

    const notes = await db.getAllAsync<{ id: string }>('SELECT id FROM journal_entries');
    for (const row of notes) {
      if (isUuid(row.id)) continue;
      await db.runAsync('UPDATE journal_entries SET id = ? WHERE id = ?', createId(), row.id);
      result.notes += 1;
    }
  } finally {
    await db.execAsync('PRAGMA foreign_keys = ON');
  }
  return result;
}

async function rewriteTombstonePayload(db: AppDatabase, nextId: string, previousId: string): Promise<void> {
  const rows = await db.getAllAsync<{ payload: string }>(
    `SELECT payload FROM sync_tombstones WHERE entity = 'session' AND entity_id = ?`,
    nextId,
  );
  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.payload) as { id?: string };
      if (!parsed || typeof parsed !== 'object' || parsed.id !== previousId) continue;
      parsed.id = nextId;
      await db.runAsync(
        `UPDATE sync_tombstones SET payload = ? WHERE entity = 'session' AND entity_id = ?`,
        JSON.stringify(parsed),
        nextId,
      );
    } catch {
      // A tombstone with a payload we cannot read is still keyed by the new id.
    }
  }
}
