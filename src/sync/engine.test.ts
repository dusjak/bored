import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';

import { SCHEMA_SQL } from '../data/schema.ts';
import {
  finishSession,
  getSession,
  insertActiveSession,
  setSetting,
  upsertJournal,
  type AppDatabase,
} from '../data/sessionQueries.ts';
import { rememberDeletedSession, syncWithTransport } from './engine.ts';
import type { RemoteSession, RemoteSetting, SyncTransport } from './model.ts';

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

function session(partial: Partial<RemoteSession> & Pick<RemoteSession, 'id' | 'updatedAt'>): RemoteSession {
  return {
    chosenDurationSeconds: 600,
    actualDurationSeconds: 600,
    status: 'completed',
    startedAt: '2026-10-18T12:00:00.000Z',
    endedAt: '2026-10-18T12:10:00.000Z',
    mood: 'calm',
    note: 'en tanke',
    createdAt: '2026-10-18T12:00:00.000Z',
    deletedAt: null,
    ...partial,
  };
}

class MemoryCloud {
  sessions = new Map<string, RemoteSession>();
  settings = new Map<string, RemoteSetting>();
  profiles: { displayName: string | null; updatedAt: string }[] = [];
  pulls = 0;

  transport: SyncTransport = {
    pullSessions: async () => {
      this.pulls += 1;
      return [...this.sessions.values()];
    },
    pullSettings: async () => [...this.settings.values()],
    upsertSessions: async (rows) => {
      for (const row of rows) this.writeSession(row);
    },
    upsertSettings: async (rows) => {
      for (const row of rows) this.writeSetting(row);
    },
    upsertProfile: async (input) => {
      this.profiles.push(input);
    },
  };

  writeSession(row: RemoteSession) {
    const previous = this.sessions.get(row.id);
    if (previous && Date.parse(previous.updatedAt) > Date.parse(row.updatedAt)) return;
    this.sessions.set(row.id, row);
  }

  writeSetting(row: RemoteSetting) {
    const previous = this.settings.get(row.key);
    if (previous && Date.parse(previous.updatedAt) > Date.parse(row.updatedAt)) return;
    this.settings.set(row.key, row);
  }
}

function throwingTransport(): SyncTransport {
  const fail = async () => {
    throw new Error('transport should not be called');
  };
  return {
    pullSessions: fail,
    pullSettings: fail,
    upsertSessions: fail,
    upsertSettings: fail,
    upsertProfile: fail,
  };
}

describe('sync engine', () => {
  it('does not touch the transport when sync is off or nobody is signed in', async () => {
    const db = openMemoryDatabase();
    const transport = throwingTransport();
    assert.deepEqual(await syncWithTransport(db, transport, { mode: 'disabled' }), { status: 'disabled' });
    assert.deepEqual(await syncWithTransport(db, transport, { mode: 'signed-out' }), { status: 'signed-out' });
  });

  it('pushes a finished session once, then stays quiet', async () => {
    const db = openMemoryDatabase();
    const cloud = new MemoryCloud();
    const created = await insertActiveSession(db, 10);
    const endedAt = new Date(Date.parse(created.startedAt) + 600_000);
    await finishSession(db, created.id, 'completed', 600, endedAt);
    await upsertJournal(db, created.id, 'calm', 'en tanke');
    await setSetting(db, 'bored.profile', '{"name":"Ada"}');
    await setSetting(db, 'bored.splashSeen', '1');

    const first = await syncWithTransport(db, cloud.transport, { mode: 'ready', userId: 'user-a' });
    assert.equal(first.status, 'synced');
    if (first.status !== 'synced') return;
    assert.equal(first.pushed, 2);
    assert.equal(cloud.sessions.size, 1);
    const remote = cloud.sessions.get(created.id);
    assert.equal(remote?.note, 'en tanke');
    assert.equal(remote?.mood, 'calm');
    assert.equal(remote?.status, 'completed');
    assert.equal(remote?.deletedAt, null);
    assert.equal(cloud.settings.has('bored.splashSeen'), false);
    assert.equal(cloud.settings.get('bored.profile')?.value, '{"name":"Ada"}');
    assert.deepEqual(cloud.profiles, [
      { displayName: 'Ada', updatedAt: cloud.settings.get('bored.profile')?.updatedAt },
    ]);

    const snapshot = structuredClone([...cloud.sessions.values()]);
    const second = await syncWithTransport(db, cloud.transport, { mode: 'ready', userId: 'user-a' });
    assert.deepEqual(second, { status: 'synced', pushed: 0, applied: 0, userId: 'user-a' });
    assert.deepEqual([...cloud.sessions.values()], snapshot);
  });

  it('pulls a remote session and a newer note, and does not resurrect a soft delete', async () => {
    const db = openMemoryDatabase();
    const cloud = new MemoryCloud();
    const remoteId = '11111111-1111-4111-8111-111111111111';
    cloud.sessions.set(
      remoteId,
      session({ id: remoteId, updatedAt: '2026-10-18T12:10:00.000Z', note: 'fra skyen' }),
    );

    const pulled = await syncWithTransport(db, cloud.transport, { mode: 'ready', userId: 'user-a' });
    assert.equal(pulled.status, 'synced');
    const loaded = await getSession(db, remoteId);
    assert.equal(loaded?.journal?.note, 'fra skyen');
    assert.equal(loaded?.actualDurationSeconds, 600);

    cloud.sessions.set(
      remoteId,
      session({
        id: remoteId,
        updatedAt: '2026-10-18T15:00:00.000Z',
        deletedAt: '2026-10-18T15:00:00.000Z',
        note: 'fra skyen',
      }),
    );
    const deleted = await syncWithTransport(db, cloud.transport, { mode: 'ready', userId: 'user-a' });
    assert.equal(deleted.status, 'synced');
    assert.equal(await getSession(db, remoteId), null);

    const again = await syncWithTransport(db, cloud.transport, { mode: 'ready', userId: 'user-a' });
    assert.deepEqual(again, { status: 'synced', pushed: 0, applied: 0, userId: 'user-a' });
    assert.equal(await getSession(db, remoteId), null);
  });

  it('keeps a newer local note and pushes it over an older cloud copy', async () => {
    const db = openMemoryDatabase();
    const cloud = new MemoryCloud();
    const created = await insertActiveSession(db, 10);
    await finishSession(db, created.id, 'completed', 600, new Date('2026-10-18T12:10:00.000Z'));
    await upsertJournal(db, created.id, 'clear', 'lokal');
    const local = await getSession(db, created.id);
    assert.ok(local);
    cloud.writeSession(
      session({
        id: created.id,
        updatedAt: '2026-10-18T11:00:00.000Z',
        note: 'gammel',
        mood: 'restless',
        startedAt: local.startedAt,
        createdAt: local.createdAt,
      }),
    );

    await syncWithTransport(db, cloud.transport, { mode: 'ready', userId: 'user-a' });
    const after = await getSession(db, created.id);
    assert.equal(after?.journal?.note, 'lokal');
    assert.equal(cloud.sessions.get(created.id)?.note, 'lokal');
    assert.equal(cloud.sessions.get(created.id)?.mood, 'clear');
  });

  it('pushes a local delete as a soft delete and does not upload an active session', async () => {
    const db = openMemoryDatabase();
    const cloud = new MemoryCloud();
    const finished = await insertActiveSession(db, 10);
    await finishSession(db, finished.id, 'aborted', 40, new Date('2026-10-18T12:02:00.000Z'));
    const active = await insertActiveSession(db, 5);
    await syncWithTransport(db, cloud.transport, { mode: 'ready', userId: 'user-a' });
    assert.equal(cloud.sessions.has(active.id), false);
    assert.equal(cloud.sessions.get(finished.id)?.status, 'aborted');

    const existing = await getSession(db, finished.id);
    assert.ok(existing);
    await db.runAsync('DELETE FROM journal_entries WHERE session_id = ?', finished.id);
    await db.runAsync('DELETE FROM sessions WHERE id = ?', finished.id);
    await rememberDeletedSession(db, existing);

    await syncWithTransport(db, cloud.transport, { mode: 'ready', userId: 'user-a' });
    assert.ok(cloud.sessions.get(finished.id)?.deletedAt);
    assert.equal(cloud.sessions.has(active.id), false);
    const tombs = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM sync_tombstones');
    assert.equal(Number(tombs?.n), 0);
  });

  it('refuses to sync a second account into this phone', async () => {
    const db = openMemoryDatabase();
    const cloud = new MemoryCloud();
    const created = await insertActiveSession(db, 10);
    await finishSession(db, created.id, 'completed', 600, new Date('2026-10-18T12:10:00.000Z'));
    await syncWithTransport(db, cloud.transport, { mode: 'ready', userId: 'user-a' });
    const pulls = cloud.pulls;
    const mismatch = await syncWithTransport(db, cloud.transport, { mode: 'ready', userId: 'user-b' });
    assert.deepEqual(mismatch, { status: 'account-mismatch', localUserId: 'user-a', remoteUserId: 'user-b' });
    assert.equal(cloud.pulls, pulls);
    assert.equal(cloud.sessions.size, 1);
  });

  it('does not copy another device in-progress session onto this phone', async () => {
    const db = openMemoryDatabase();
    const cloud = new MemoryCloud();
    const remoteId = '22222222-2222-4222-8222-222222222222';
    cloud.sessions.set(
      remoteId,
      session({
        id: remoteId,
        status: 'active',
        actualDurationSeconds: 0,
        endedAt: null,
        note: '',
        mood: null,
        updatedAt: '2026-10-18T12:00:00.000Z',
      }),
    );
    const report = await syncWithTransport(db, cloud.transport, { mode: 'ready', userId: 'user-a' });
    assert.deepEqual(report, { status: 'synced', pushed: 0, applied: 0, userId: 'user-a' });
    assert.equal(await getSession(db, remoteId), null);
  });
});
