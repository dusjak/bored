/** Local preview record stored in `app_state.backupPreview`. Nothing here is uploaded. */

export type BackupAccount = 'apple' | 'anonymous';

/** Screens that need another phone or a server. The hidden menu is the only way to open them in preview. */
export type PreviewForce = 'restored' | 'accountSwitch' | 'alreadyExists' | 'signedOut' | 'stale' | 'keyMissing';

export type BackupNotice = 'deleted' | 'linked';

export type BackupPreview = {
  enabled: boolean;
  account: BackupAccount | null;
  forced: PreviewForce | null;
  notice: BackupNotice | null;
  notificationsDeniedAfterRestore: boolean;
  restorePermissionAsked: boolean;
};

export const EMPTY_PREVIEW: BackupPreview = {
  enabled: false,
  account: null,
  forced: null,
  notice: null,
  notificationsDeniedAfterRestore: false,
  restorePermissionAsked: false,
};

const FORCES: readonly PreviewForce[] = ['restored', 'accountSwitch', 'alreadyExists', 'signedOut', 'stale', 'keyMissing'];

function isForce(value: unknown): value is PreviewForce {
  return typeof value === 'string' && (FORCES as readonly string[]).includes(value);
}

export function parseBackupPreview(raw: string | null): BackupPreview {
  if (!raw) return EMPTY_PREVIEW;
  try {
    const parsed = JSON.parse(raw) as Partial<BackupPreview>;
    if (!parsed || typeof parsed !== 'object') return EMPTY_PREVIEW;
    return {
      enabled: parsed.enabled === true,
      account: parsed.account === 'apple' || parsed.account === 'anonymous' ? parsed.account : null,
      forced: isForce(parsed.forced) ? parsed.forced : null,
      notice: parsed.notice === 'deleted' || parsed.notice === 'linked' ? parsed.notice : null,
      notificationsDeniedAfterRestore: parsed.notificationsDeniedAfterRestore === true,
      restorePermissionAsked: parsed.restorePermissionAsked === true,
    };
  } catch {
    return EMPTY_PREVIEW;
  }
}

export type BackupView =
  | 'off'
  | 'on'
  | 'anonymous'
  | 'restored'
  | 'deleted'
  | 'signedOut'
  | 'stale'
  | 'linked'
  | 'keyMissing';

/** Which backup screen to paint. Forced previews win over the stored account. */
export function resolveBackupView(preview: BackupPreview): BackupView {
  if (preview.forced === 'restored') return 'restored';
  if (preview.forced === 'signedOut') return 'signedOut';
  if (preview.forced === 'stale') return 'stale';
  if (preview.forced === 'keyMissing') return 'keyMissing';
  if (preview.notice === 'deleted') return 'deleted';
  if (preview.notice === 'linked') return 'linked';
  if (!preview.enabled) return 'off';
  if (preview.account === 'anonymous') return 'anonymous';
  return 'on';
}

export type DegBackupValue = 'hidden' | 'off' | 'on' | 'onTest' | 'stale';

export function degBackupValue(mode: 'off' | 'preview' | 'live', preview: BackupPreview): DegBackupValue {
  if (mode === 'off') return 'hidden';
  if (preview.forced === 'stale' && preview.enabled) return 'stale';
  if (!preview.enabled) return 'off';
  if (mode === 'preview') return 'onTest';
  return 'on';
}

/** In preview the line is always true. In live it shows only while backup is off. */
export function showHonestyLine(mode: 'off' | 'preview' | 'live', preview: BackupPreview): boolean {
  if (mode === 'off') return false;
  if (mode === 'preview') return true;
  return !preview.enabled;
}

/**
 * Nullstill deletes a cloud copy only when an account exists or backup is on.
 * Anonymous turn-off already dropped the account, so that path stays local.
 */
export function resetNeedsNetwork(preview: BackupPreview): boolean {
  return preview.enabled || preview.account != null;
}
