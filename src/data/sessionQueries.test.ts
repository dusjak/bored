import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';

import { SCHEMA_SQL } from './schema.ts';
import {
  clearAllLocalData,
  deleteSession,
  finishSession,
  getSession,
  insertActiveSession,
  listFinishedSessions,
  sessionTotals,
  setSetting,
  tallyMarks,
  upsertJournal,
  type AppDatabase,
} from './sessionQueries.ts';

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

describe('session notes and delete', () => {
  it('reads one session with its note and deletes both', async () => {
    const db = openMemoryDatabase();
    const kept = await insertActiveSession(db, 10);
    await finishSession(db, kept.id, 'aborted', 125, new Date('2026-10-18T12:02:05.000Z'));

    const ended = await insertActiveSession(db, 10);
    const endedAt = new Date(Date.parse(ended.startedAt) + ended.chosenDurationSeconds * 1000);
    await finishSession(db, ended.id, 'completed', ended.chosenDurationSeconds, endedAt);
    await upsertJournal(db, ended.id, 'calm', 'en tanke');

    const loaded = await getSession(db, ended.id);
    assert.ok(loaded);
    assert.equal(loaded.status, 'completed');
    assert.equal(loaded.actualDurationSeconds, 600);
    assert.equal(loaded.endedAt, endedAt.toISOString());
    assert.equal(loaded.journal?.note, 'en tanke');
    assert.equal(loaded.journal?.mood, 'calm');

    const before = sessionTotals(await listFinishedSessions(db));
    assert.deepEqual(before, { total: 2, completed: 1, aborted: 1 });

    await deleteSession(db, ended.id);

    assert.equal(await getSession(db, ended.id), null);
    const note = await db.getFirstAsync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM journal_entries WHERE session_id = ?',
      ended.id,
    );
    assert.equal(note?.n, 0);

    const remaining = await listFinishedSessions(db);
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0]?.id, kept.id);
    assert.equal(remaining[0]?.journal, null);
    assert.deepEqual(sessionTotals(remaining), { total: 1, completed: 0, aborted: 1 });
  });

  it('returns null for an unknown session', async () => {
    const db = openMemoryDatabase();
    assert.equal(await getSession(db, 'missing'), null);
  });

  it('draws tally marks oldest first and marks an aborted session', async () => {
    const db = openMemoryDatabase();
    const first = await insertActiveSession(db, 10);
    await finishSession(db, first.id, 'completed', 600, new Date('2026-10-18T12:10:00.000Z'));
    const second = await insertActiveSession(db, 5);
    await finishSession(db, second.id, 'aborted', 40, new Date('2026-10-18T13:00:00.000Z'));
    const marks = tallyMarks(await listFinishedSessions(db));
    assert.deepEqual(marks, [{ aborted: false }, { aborted: true }]);
  });

  it('clears sessions, notes, and settings together', async () => {
    const db = openMemoryDatabase();
    const session = await insertActiveSession(db, 10);
    await finishSession(db, session.id, 'completed', 600, new Date('2026-10-18T12:10:00.000Z'));
    await upsertJournal(db, session.id, 'calm', 'en tanke');
    await setSetting(db, 'bored.themePreference', 'dark');
    await setSetting(db, 'bored.onboarded', '1');
    await setSetting(db, 'bored.splashSeen', '1');
    await clearAllLocalData(db);
    assert.equal(await getSession(db, session.id), null);
    assert.deepEqual(sessionTotals(await listFinishedSessions(db)), { total: 0, completed: 0, aborted: 0 });
    const settings = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM settings');
    assert.equal(Number(settings?.n), 0);
    const notes = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM journal_entries');
    assert.equal(Number(notes?.n), 0);
  });
});
