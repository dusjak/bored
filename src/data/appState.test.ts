import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';

import {
  BACKUP_EVER_ENABLED_KEY,
  BACKUP_PREVIEW_KEY,
  dismissNudgeFlags,
  LEGACY_NUDGE_KEYS,
  NUDGE_DISMISS_COUNT_KEY,
  NUDGE_DISMISSED_AT_KEY,
  NUDGE_DISMISSED_AT_SESSIONS_KEY,
  purgeLegacyNudgeFlags,
  readNudgeFlags,
  writeBackupPreview,
  writeNudgeFlags,
} from './appState.ts';
import { SCHEMA_SQL } from './schema.ts';
import { clearAllLocalData, setSetting, type AppDatabase } from './sessionQueries.ts';
import { EMPTY_PREVIEW } from '../backup/model.ts';

function openMemoryDatabase(): AppDatabase {
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
  };
}

describe('Nullstill and backup flags', () => {
  it('deletes the nudge flags, backupPreview, and the old v0.3 keys', async () => {
    const db = openMemoryDatabase();
    await writeNudgeFlags(db, {
      dismissCount: 1,
      dismissedAtSessions: 4,
      dismissedAt: '2026-11-01T12:00:00.000Z',
      everEnabled: true,
    });
    await writeBackupPreview(db, { ...EMPTY_PREVIEW, enabled: true, account: 'apple' });
    for (const key of LEGACY_NUDGE_KEYS) {
      await db.runAsync('INSERT INTO app_state (key, value) VALUES (?, ?)', key, 'legacy');
    }
    await setSetting(db, 'bored.onboarded', '1');

    await clearAllLocalData(db);

    const rows = await db.getAllAsync<{ key: string }>('SELECT key FROM app_state');
    assert.deepEqual(rows, []);
    const settings = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM settings');
    assert.equal(Number(settings?.n), 0);
    const fresh = await readNudgeFlags(db);
    assert.equal(fresh.dismissCount, 0);
    assert.equal(fresh.dismissedAtSessions, null);
    assert.equal(fresh.everEnabled, false);
  });

  it('drops the v0.3 keys on their own and keeps the v0.4 flags', async () => {
    const db = openMemoryDatabase();
    await dismissNudgeFlags(db, 3, '2026-11-01T12:00:00.000Z');
    for (const key of LEGACY_NUDGE_KEYS) {
      await db.runAsync('INSERT INTO app_state (key, value) VALUES (?, ?)', key, 'legacy');
    }
    await purgeLegacyNudgeFlags(db);
    const flags = await readNudgeFlags(db);
    assert.equal(flags.dismissCount, 1);
    assert.equal(flags.dismissedAtSessions, 3);
    for (const key of LEGACY_NUDGE_KEYS) {
      const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_state WHERE key = ?', key);
      assert.equal(row, null);
    }
    const kept = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM app_state WHERE key = ?',
      NUDGE_DISMISS_COUNT_KEY,
    );
    assert.equal(kept?.value, '1');
    assert.ok(NUDGE_DISMISSED_AT_SESSIONS_KEY);
    assert.ok(NUDGE_DISMISSED_AT_KEY);
    assert.ok(BACKUP_EVER_ENABLED_KEY);
    assert.ok(BACKUP_PREVIEW_KEY);
  });
});
