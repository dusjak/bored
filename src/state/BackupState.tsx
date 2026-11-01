import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { currentBackupMode } from '@/backup/currentMode';
import type { BackupPreview, PreviewForce } from '@/backup/model';
import { EMPTY_PREVIEW } from '@/backup/model';
import type { BackupMode } from '@/backup/mode';
import { EMPTY_NUDGE, type NudgeFlags } from '@/backup/nudge';
import { createBackupService, type BackupService, type BackupSnapshot } from '@/backup/service';
import { sqliteBackupStore } from '@/backup/store';
import { dismissBackupNudge, loadNudgeFlags } from '@/data/repository';

type BackupContextValue = {
  ready: boolean;
  mode: BackupMode;
  preview: BackupPreview;
  everEnabled: boolean;
  nudge: NudgeFlags;
  dismissNudge: (completed: number) => Promise<void>;
  enableWithApple: () => Promise<void>;
  enableAnonymous: () => Promise<void>;
  linkApple: () => Promise<void>;
  turnOff: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  prepareReset: () => Promise<'ok' | 'failed'>;
  forcePreview: (screen: PreviewForce | null) => Promise<void>;
  confirmAccountSwitch: () => Promise<void>;
  cancelAccountSwitch: () => Promise<void>;
  confirmExistingBackup: () => Promise<void>;
  cancelExistingBackup: () => Promise<void>;
  startNewCopy: () => Promise<void>;
  markRestorePermission: (denied: boolean) => Promise<void>;
  clearRestoreNotificationLine: () => Promise<void>;
  dismissNotice: () => Promise<void>;
  /** Drops in-memory backup state after Nullstill has wiped SQLite. */
  forget: () => void;
};

const Ctx = createContext<BackupContextValue | null>(null);

export function BackupProvider({ children }: { children: ReactNode }) {
  const mode = useMemo(() => currentBackupMode(), []);
  const serviceRef = useRef<BackupService | null>(null);
  const [ready, setReady] = useState(false);
  const [preview, setPreview] = useState<BackupPreview>(EMPTY_PREVIEW);
  const [everEnabled, setEverEnabled] = useState(false);
  const [nudge, setNudge] = useState<NudgeFlags>(EMPTY_NUDGE);

  const apply = useCallback((snapshot: BackupSnapshot) => {
    setPreview(snapshot.preview);
    setEverEnabled(snapshot.everEnabled);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const service = createBackupService(mode, sqliteBackupStore());
    serviceRef.current = service;
    (async () => {
      try {
        const flags = await loadNudgeFlags();
        if (!cancelled) setNudge(flags);
        if (service) {
          const snapshot = await service.load();
          if (!cancelled) apply(snapshot);
        }
      } catch {
        // A storage miss hides the hint. The rest of the app still opens.
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apply, mode]);

  const run = useCallback(
    async (action: (service: BackupService) => Promise<BackupSnapshot>) => {
      const service = serviceRef.current;
      if (!service) return;
      apply(await action(service));
    },
    [apply],
  );

  const dismissNudge = useCallback(async (completed: number) => {
    const next = await dismissBackupNudge(completed, new Date().toISOString());
    setNudge(next);
  }, []);

  const forget = useCallback(() => {
    setPreview(EMPTY_PREVIEW);
    setEverEnabled(false);
    setNudge(EMPTY_NUDGE);
  }, []);

  const value = useMemo<BackupContextValue>(
    () => ({
      ready,
      mode,
      preview,
      everEnabled,
      nudge,
      dismissNudge,
      enableWithApple: () => run((service) => service.enableWithApple()),
      enableAnonymous: () => run((service) => service.enableAnonymous()),
      linkApple: () => run((service) => service.linkApple()),
      turnOff: () => run((service) => service.turnOff()),
      deleteAccount: () => run((service) => service.deleteAccount()),
      prepareReset: async () => {
        const service = serviceRef.current;
        if (!service) return 'ok';
        return service.prepareReset();
      },
      forcePreview: (screen) => run((service) => service.force(screen)),
      confirmAccountSwitch: () => run((service) => service.confirmAccountSwitch()),
      cancelAccountSwitch: () => run((service) => service.cancelAccountSwitch()),
      confirmExistingBackup: () => run((service) => service.confirmExistingBackup()),
      cancelExistingBackup: () => run((service) => service.cancelExistingBackup()),
      startNewCopy: () => run((service) => service.startNewCopy()),
      markRestorePermission: (denied) => run((service) => service.markRestorePermission(denied)),
      clearRestoreNotificationLine: () => run((service) => service.clearRestoreNotificationLine()),
      dismissNotice: () => run((service) => service.dismissNotice()),
      forget,
    }),
    [ready, mode, preview, everEnabled, nudge, dismissNudge, run, forget],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBackup() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useBackup must be used inside BackupProvider');
  return ctx;
}
