/**
 * Build flag for sikkerhetskopi.
 * `preview` is TestFlight v1: the UI is real, nothing leaves the phone.
 * `live` is v2 (Supabase). `off` hides the feature.
 * The check runs when Expo evaluates `app.config.ts`, so an App Store build
 * cannot ship the preview by accident.
 */

export const BACKUP_MODES = ['off', 'preview', 'live'] as const;
export type BackupMode = (typeof BACKUP_MODES)[number];

export function isBackupMode(value: string): value is BackupMode {
  return (BACKUP_MODES as readonly string[]).includes(value);
}

/**
 * Rejects `preview` when EAS is building the production profile.
 * Any other profile, including an unset one, may use `preview`.
 */
export function assertBackupMode(mode: string, easBuildProfile: string | undefined): BackupMode {
  if (!isBackupMode(mode)) {
    throw new Error(`BACKUP_MODE must be 'off', 'preview', or 'live'. Received '${mode}'.`);
  }
  if (mode === 'preview' && easBuildProfile === 'production') {
    throw new Error(
      "BACKUP_MODE 'preview' cannot ship when EAS_BUILD_PROFILE is 'production'. Use 'off' or 'live'.",
    );
  }
  return mode;
}
