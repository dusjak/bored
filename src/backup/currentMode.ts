import Constants from 'expo-constants';

import { assertBackupMode, type BackupMode } from '@/backup/mode';
import { easBuildProfile } from '@/config/buildProfile';

/**
 * Mode baked into the build by `app.config.js`.
 * A missing manifest, or a constants read that throws, falls back to preview.
 * `assertBackupMode` still rejects preview when the profile is production.
 */
export function currentBackupMode(): BackupMode {
  return assertBackupMode(readBackupMode(), easBuildProfile());
}

function readBackupMode(): string {
  try {
    const extra = Constants.expoConfig?.extra;
    const raw =
      extra && typeof extra === 'object' && 'backupMode' in extra
        ? (extra as { backupMode?: unknown }).backupMode
        : undefined;
    return typeof raw === 'string' ? raw : 'preview';
  } catch {
    return 'preview';
  }
}
