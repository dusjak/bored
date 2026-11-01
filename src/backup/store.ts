import type { BackupStore } from '@/backup/service';
import {
  loadBackupEverEnabled,
  loadBackupPreview,
  markBackupEverEnabled,
  saveBackupPreview,
} from '@/data/repository';

/** SQLite backing for `app_state.backupPreview` and `backupEverEnabled`. */
export function sqliteBackupStore(): BackupStore {
  return {
    readPreview: () => loadBackupPreview(),
    writePreview: (value) => saveBackupPreview(value),
    readEverEnabled: () => loadBackupEverEnabled(),
    writeEverEnabled: async (on) => {
      if (on) await markBackupEverEnabled();
    },
  };
}
