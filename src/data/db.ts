import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'bored.db';

let opening: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Opens the on-device database. Screens never call this; they go through the repository.
 * The same file is used in Expo Go and in a standalone build. Data does not move between them.
 */
export function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!opening) {
    opening = SQLite.openDatabaseAsync(DATABASE_NAME).then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY NOT NULL,
          chosen_duration_seconds INTEGER NOT NULL,
          actual_duration_seconds INTEGER NOT NULL,
          status TEXT NOT NULL,
          started_at TEXT NOT NULL,
          ended_at TEXT,
          backgrounded_at TEXT,
          notification_id TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS journal_entries (
          id TEXT PRIMARY KEY NOT NULL,
          session_id TEXT NOT NULL,
          mood TEXT,
          note TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (session_id) REFERENCES sessions(id)
        );
        CREATE UNIQUE INDEX IF NOT EXISTS journal_entries_session_id ON journal_entries(session_id);
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
      return db;
    });
  }
  return opening;
}

/** Test-only reset so a failed open can be retried. */
export function resetDatabaseForTests() {
  opening = null;
}
