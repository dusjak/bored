import Constants from 'expo-constants';

import { assertBackupMode, type BackupMode } from '@/backup/mode';
import { easBuildProfile } from '@/config/buildProfile';

/** Mode baked into the build by `app.config.js`. Missing extra falls back to preview. */
export function currentBackupMode(): BackupMode {
  const extra = Constants.expoConfig?.extra;
  const raw =
    extra && typeof extra === 'object' && 'backupMode' in extra ? (extra as { backupMode?: unknown }).backupMode : undefined;
  const mode = typeof raw === 'string' ? raw : 'preview';
  return assertBackupMode(mode, easBuildProfile());
}
