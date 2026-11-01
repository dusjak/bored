import type { BackupPreview, PreviewForce } from '@/backup/model';
import { EMPTY_PREVIEW } from '@/backup/model';
import type { BackupMode } from '@/backup/mode';

export type BackupSnapshot = {
  preview: BackupPreview;
  everEnabled: boolean;
};

/**
 * What the screens ask for. v1 ships `MockBackupService`.
 * v2 adds `SupabaseBackupService` and swaps it in `createBackupService`.
 * The screens do not import either class.
 */
export interface BackupService {
  load(): Promise<BackupSnapshot>;
  /** Apple sheet already succeeded. The credential is not passed in and is not stored. */
  enableWithApple(): Promise<BackupSnapshot>;
  enableAnonymous(): Promise<BackupSnapshot>;
  linkApple(): Promise<BackupSnapshot>;
  turnOff(): Promise<BackupSnapshot>;
  deleteAccount(): Promise<BackupSnapshot>;
  /** v2 deletes the cloud copy here. The mock has nothing to delete. */
  prepareReset(): Promise<'ok' | 'failed'>;
  force(screen: PreviewForce | null): Promise<BackupSnapshot>;
  confirmAccountSwitch(): Promise<BackupSnapshot>;
  cancelAccountSwitch(): Promise<BackupSnapshot>;
  confirmExistingBackup(): Promise<BackupSnapshot>;
  cancelExistingBackup(): Promise<BackupSnapshot>;
  startNewCopy(): Promise<BackupSnapshot>;
  markRestorePermission(denied: boolean): Promise<BackupSnapshot>;
  clearRestoreNotificationLine(): Promise<BackupSnapshot>;
  dismissNotice(): Promise<BackupSnapshot>;
}

export type BackupStore = {
  readPreview(): Promise<BackupPreview>;
  writePreview(value: BackupPreview): Promise<void>;
  readEverEnabled(): Promise<boolean>;
  writeEverEnabled(on: boolean): Promise<void>;
};

export class MockBackupService implements BackupService {
  constructor(private readonly store: BackupStore) {}

  async load(): Promise<BackupSnapshot> {
    const [preview, everEnabled] = await Promise.all([this.store.readPreview(), this.store.readEverEnabled()]);
    return { preview, everEnabled };
  }

  private async save(preview: BackupPreview, everEnabled: boolean): Promise<BackupSnapshot> {
    await this.store.writePreview(preview);
    if (everEnabled) await this.store.writeEverEnabled(true);
    return { preview, everEnabled };
  }

  async enableWithApple(): Promise<BackupSnapshot> {
    const current = await this.load();
    return this.save(
      { ...current.preview, enabled: true, account: 'apple', forced: null, notice: null },
      true,
    );
  }

  async enableAnonymous(): Promise<BackupSnapshot> {
    const current = await this.load();
    return this.save(
      { ...current.preview, enabled: true, account: 'anonymous', forced: null, notice: null },
      true,
    );
  }

  async linkApple(): Promise<BackupSnapshot> {
    const current = await this.load();
    return this.save(
      { ...current.preview, enabled: true, account: 'apple', forced: null, notice: 'linked' },
      true,
    );
  }

  async turnOff(): Promise<BackupSnapshot> {
    const current = await this.load();
    const anonymous = current.preview.account === 'anonymous';
    return this.save(
      {
        ...current.preview,
        enabled: false,
        account: anonymous ? null : current.preview.account,
        forced: null,
        notice: null,
      },
      current.everEnabled,
    );
  }

  async deleteAccount(): Promise<BackupSnapshot> {
    const current = await this.load();
    return this.save(
      {
        ...EMPTY_PREVIEW,
        notice: 'deleted',
      },
      current.everEnabled,
    );
  }

  async prepareReset(): Promise<'ok' | 'failed'> {
    return 'ok';
  }

  async force(screen: PreviewForce | null): Promise<BackupSnapshot> {
    const current = await this.load();
    if (screen == null) {
      return this.save({ ...current.preview, forced: null }, current.everEnabled);
    }
    const base: BackupPreview = { ...current.preview, forced: screen, notice: null };
    if (screen === 'restored' || screen === 'stale' || screen === 'keyMissing') {
      base.enabled = true;
      base.account = 'apple';
    }
    if (screen === 'restored') base.restorePermissionAsked = false;
    if (screen === 'accountSwitch' || screen === 'signedOut') {
      base.enabled = false;
      base.account = 'apple';
    }
    if (screen === 'alreadyExists') {
      base.enabled = true;
      base.account = 'anonymous';
    }
    return this.save(base, current.everEnabled);
  }

  async confirmAccountSwitch(): Promise<BackupSnapshot> {
    const current = await this.load();
    return this.save(
      { ...current.preview, enabled: true, account: 'apple', forced: null, notice: null },
      true,
    );
  }

  async cancelAccountSwitch(): Promise<BackupSnapshot> {
    const current = await this.load();
    return this.save(
      { ...current.preview, enabled: false, account: 'apple', forced: null, notice: null },
      current.everEnabled,
    );
  }

  async confirmExistingBackup(): Promise<BackupSnapshot> {
    const current = await this.load();
    return this.save(
      { ...current.preview, enabled: true, account: 'apple', forced: null, notice: 'linked' },
      true,
    );
  }

  async cancelExistingBackup(): Promise<BackupSnapshot> {
    const current = await this.load();
    return this.save({ ...current.preview, forced: null }, current.everEnabled);
  }

  async startNewCopy(): Promise<BackupSnapshot> {
    const current = await this.load();
    return this.save(
      { ...current.preview, enabled: true, account: 'apple', forced: null, notice: null },
      true,
    );
  }

  async markRestorePermission(denied: boolean): Promise<BackupSnapshot> {
    const current = await this.load();
    return this.save(
      {
        ...current.preview,
        restorePermissionAsked: true,
        notificationsDeniedAfterRestore: denied,
      },
      current.everEnabled,
    );
  }

  async clearRestoreNotificationLine(): Promise<BackupSnapshot> {
    const current = await this.load();
    return this.save({ ...current.preview, notificationsDeniedAfterRestore: false }, current.everEnabled);
  }

  async dismissNotice(): Promise<BackupSnapshot> {
    const current = await this.load();
    if (!current.preview.notice) return current;
    return this.save({ ...current.preview, notice: null }, current.everEnabled);
  }
}

/**
 * `off` and `live` return null. `live` is the v2 swap point:
 * `return new SupabaseBackupService(store)` once that class exists.
 */
export function createBackupService(mode: BackupMode, store: BackupStore): BackupService | null {
  if (mode === 'preview') return new MockBackupService(store);
  return null;
}
