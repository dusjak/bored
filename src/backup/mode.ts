import { isProductionBuildProfile } from '../config/buildProfile.ts';

/**
 * Build flag for sikkerhetskopi.
 * `preview` is TestFlight v1: the UI is real, nothing leaves the phone.
 * `live` is v2 (Supabase). `off` hides the feature.
 * `fakedoor` may ship in production: nothing leaves the phone and Apple is not called.
 * The check runs when Expo evaluates `app.config.js`, so an App Store build
 * cannot ship the preview by accident. `testflight` is not production.
 */

export const BACKUP_MODES = ['off', 'preview', 'live', 'fakedoor'] as const;
export type BackupMode = (typeof BACKUP_MODES)[number];

export function isBackupMode(value: string): value is BackupMode {
  return (BACKUP_MODES as readonly string[]).includes(value);
}

/**
 * Rejects `preview` only when the EAS profile is production.
 * `testflight`, preview, development, and an unset profile may use `preview`.
 */
export function assertBackupMode(mode: string, easBuildProfile: string | null | undefined): BackupMode {
  if (!isBackupMode(mode)) {
    throw new Error(`BACKUP_MODE must be 'off', 'preview', 'live', or 'fakedoor'. Received '${mode}'.`);
  }
  if (mode === 'preview' && isProductionBuildProfile(easBuildProfile)) {
    throw new Error(
      "BACKUP_MODE 'preview' cannot ship when EAS_BUILD_PROFILE is 'production'. Use 'off' or 'live'.",
    );
  }
  return mode;
}
