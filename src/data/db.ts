import * as SQLite from 'expo-sqlite';

import { migrateLegacyIds } from '@/data/migrateIds';
import { SCHEMA_SQL } from '@/data/schema';
import type { AppDatabase } from '@/data/sessionQueries';

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
        ${SCHEMA_SQL}
      `);
      await migrateLegacyIds(db as unknown as AppDatabase);
      return db;
    });
  }
  return opening;
}

/** Test-only reset so a failed open can be retried. */
export function resetDatabaseForTests() {
  opening = null;
}
