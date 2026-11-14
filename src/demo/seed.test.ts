import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';

import { SCHEMA_SQL } from '../data/schema.ts';
import { getSetting, listFinishedSessions, type AppDatabase } from '../data/sessionQueries.ts';
import { applyDemoSeed, demoSessions, seedDemoData, shouldRunDemoSeed } from './seed.ts';

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

describe('demo seed', () => {
  it('is a no-op when __DEV__ is false', async () => {
    assert.equal(shouldRunDemoSeed(false), false);
    assert.equal(shouldRunDemoSeed(undefined), false);
    assert.equal(await seedDemoData(false), false);
    assert.equal(await seedDemoData(undefined), false);
  });

  it('replaces sessions with fourteen realistic ones and the screenshot settings', async () => {
    const db = openMemoryDatabase();
    const now = new Date('2026-11-12T12:00:00.000Z');
    await applyDemoSeed(db, now);
    const sessions = await listFinishedSessions(db);
    assert.equal(sessions.length, 14);
    assert.equal(demoSessions().length, 14);
    assert.equal(sessions.filter((session) => session.status === 'aborted').length, 3);
    assert.equal(sessions.filter((session) => session.status === 'completed').length, 11);
    const notes = sessions.map((session) => session.journal?.note).filter((note) => note);
    assert.deepEqual(notes.sort(), [
      'En drøm fra for mange år siden.',
      'Hodet ble roligere mot slutten.',
      'Ingenting. Og det var greit.',
      'Tankene vandret til barndomshjemmet.',
      'Tenkte på ingenting. Det var godt.',
    ]);
    assert.ok(sessions.some((session) => session.journal?.mood === 'calm'));
    const minutes = new Set(sessions.map((session) => session.chosenDurationSeconds / 60));
    assert.deepEqual([...minutes].sort((a, b) => a - b), [5, 10, 15, 20]);
    assert.equal(await getSetting(db, 'bored.onboarded'), '1');
    assert.equal(await getSetting(db, 'bored.themePreference'), 'light');
    assert.equal(await getSetting(db, 'bored.defaultDurationMinutes'), '10');
    const oldest = Date.parse(sessions[sessions.length - 1]?.startedAt ?? '');
    const newest = Date.parse(sessions[0]?.startedAt ?? '');
    assert.ok(newest <= now.getTime());
    assert.ok(now.getTime() - oldest < 22 * 24 * 60 * 60 * 1000);
  });
});
