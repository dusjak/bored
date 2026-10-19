import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';

import { isUuid } from './ids.ts';
import { migrateLegacyIds } from './migrateIds.ts';
import { SCHEMA_SQL } from './schema.ts';
import { createId, type AppDatabase } from './sessionQueries.ts';

function openMemoryDatabase(): AppDatabase & { foreignKeys(): number } {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(SCHEMA_SQL);
  return {
    async execAsync(source) {
      db.exec(source);
    },
    async runAsync(source, ...params) {
      db.prepare(source).run(...params);
    },
    async getFirstAsync<T>(source: string, ...params: (string | number | null)[]) {
      const row = db.prepare(source).get(...params);
      return (row as T | undefined) ?? null;
    },
    async getAllAsync<T>(source: string, ...params: (string | number | null)[]) {
      return db.prepare(source).all(...params) as T[];
    },
    foreignKeys() {
      const row = db.prepare('PRAGMA foreign_keys').get() as { foreign_keys: number };
      return Number(row.foreign_keys);
    },
  };
}

describe('legacy id migration', () => {
  it('mints uuid ids for new sessions', () => {
    for (let i = 0; i < 20; i += 1) assert.equal(isUuid(createId()), true);
    assert.equal(isUuid('1'), false);
    assert.equal(isUuid('session-1'), false);
  });

  it('rewrites non-uuid session and note ids and leaves real uuids alone', async () => {
    const db = openMemoryDatabase();
    const kept = createId();
    await db.runAsync(
      `INSERT INTO sessions (
        id, chosen_duration_seconds, actual_duration_seconds, status,
        started_at, ended_at, backgrounded_at, notification_id, created_at, updated_at
      ) VALUES ('1', 600, 600, 'completed', '2026-10-18T12:00:00.000Z', '2026-10-18T12:10:00.000Z', NULL, NULL, '2026-10-18T12:00:00.000Z', '2026-10-18T12:10:00.000Z')`,
    );
    await db.runAsync(
      `INSERT INTO sessions (
        id, chosen_duration_seconds, actual_duration_seconds, status,
        started_at, ended_at, backgrounded_at, notification_id, created_at, updated_at
      ) VALUES (?, 300, 300, 'aborted', '2026-10-18T13:00:00.000Z', '2026-10-18T13:05:00.000Z', NULL, NULL, '2026-10-18T13:00:00.000Z', '2026-10-18T13:05:00.000Z')`,
      kept,
    );
    await db.runAsync(
      `INSERT INTO journal_entries (id, session_id, mood, note, created_at, updated_at)
       VALUES ('note-1', '1', 'calm', 'en tanke', '2026-10-18T12:11:00.000Z', '2026-10-18T12:11:00.000Z')`,
    );
    await db.runAsync(
      `INSERT INTO sync_tombstones (entity, entity_id, updated_at, deleted_at, payload)
       VALUES ('session', '1', '2026-10-18T12:12:00.000Z', '2026-10-18T12:12:00.000Z', '{"id":"1"}')`,
    );
    await db.runAsync(
      `INSERT INTO settings (key, value, updated_at) VALUES ('bored.profile', '{"name":"Ada"}', '2026-10-18T12:00:00.000Z')`,
    );

    const first = await migrateLegacyIds(db);
    assert.deepEqual(first, { sessions: 1, notes: 1 });
    assert.equal(db.foreignKeys(), 1);

    const sessions = await db.getAllAsync<{ id: string }>('SELECT id FROM sessions ORDER BY started_at');
    assert.equal(sessions.length, 2);
    assert.equal(isUuid(sessions[0]?.id ?? ''), true);
    assert.notEqual(sessions[0]?.id, '1');
    assert.equal(sessions[1]?.id, kept);

    const note = await db.getFirstAsync<{ id: string; session_id: string; note: string }>(
      'SELECT id, session_id, note FROM journal_entries',
    );
    assert.ok(note);
    assert.equal(isUuid(note.id), true);
    assert.equal(note.session_id, sessions[0]?.id);
    assert.equal(note.note, 'en tanke');

    const tomb = await db.getFirstAsync<{ entity_id: string; payload: string }>(
      `SELECT entity_id, payload FROM sync_tombstones WHERE entity = 'session'`,
    );
    assert.equal(tomb?.entity_id, sessions[0]?.id);
    assert.equal(JSON.parse(tomb?.payload ?? '{}').id, sessions[0]?.id);

    const setting = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', 'bored.profile');
    assert.equal(setting?.value, '{"name":"Ada"}');

    const second = await migrateLegacyIds(db);
    assert.deepEqual(second, { sessions: 0, notes: 0 });
    const again = await db.getAllAsync<{ id: string }>('SELECT id FROM sessions ORDER BY started_at');
    assert.equal(again[0]?.id, sessions[0]?.id);
    assert.equal(again[1]?.id, kept);
  });
});
