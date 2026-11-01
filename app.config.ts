import type { ConfigContext, ExpoConfig } from 'expo/config';

import { assertBackupMode } from './src/backup/mode.ts';

/**
 * v1 ships `preview`. `eas build --profile production` fails while this stays preview.
 * Set BACKUP_MODE=off or BACKUP_MODE=live for that profile.
 * The static app.json (splash included) is the base; this only adds the backup flag
 * and Sign in with Apple.
 */
const backupMode = assertBackupMode(process.env.BACKUP_MODE ?? 'preview', process.env.EAS_BUILD_PROFILE);

export default ({ config }: ConfigContext): ExpoConfig =>
  ({
    ...config,
    ios: {
      ...config.ios,
      usesAppleSignIn: true,
    },
    plugins: [...(config.plugins ?? []), 'expo-apple-authentication'],
    extra: {
      ...config.extra,
      backupMode,
    },
  }) as ExpoConfig;
