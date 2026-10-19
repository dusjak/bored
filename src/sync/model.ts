import { MOODS, type MoodId, type SessionStatus } from '../data/types.ts';

/** Settings that are part of a backup. `bored.splashSeen` stays on the device. */
export const SYNCED_SETTING_KEYS = [
  'bored.themePreference',
  'bored.defaultDurationMinutes',
  'bored.onboarded',
  'bored.profile',
  'bored.showCountdown',
] as const;

export const PROFILE_SETTING_KEY = 'bored.profile';
export const BOUND_USER_KEY = 'bound_user_id';

export type RemoteSession = {
  id: string;
  chosenDurationSeconds: number;
  actualDurationSeconds: number;
  status: Exclude<SessionStatus, 'active'> | 'active';
  startedAt: string;
  endedAt: string | null;
  mood: MoodId | null;
  note: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type RemoteSetting = {
  key: string;
  value: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type SyncStamp = {
  updatedAt: string;
  deletedAt: string | null;
};

export type SyncTransport = {
  pullSessions(): Promise<RemoteSession[]>;
  pullSettings(): Promise<RemoteSetting[]>;
  upsertSessions(rows: RemoteSession[]): Promise<void>;
  upsertSettings(rows: RemoteSetting[]): Promise<void>;
  upsertProfile(input: { displayName: string | null; updatedAt: string }): Promise<void>;
};

export type SyncGate =
  | { mode: 'disabled' }
  | { mode: 'signed-out' }
  | { mode: 'ready'; userId: string };

export type SyncReport =
  | { status: 'disabled' }
  | { status: 'signed-out' }
  | { status: 'account-mismatch'; localUserId: string; remoteUserId: string }
  | { status: 'synced'; pushed: number; applied: number; userId: string };

export function isMood(value: string | null | undefined): value is MoodId {
  return value != null && MOODS.some((mood) => mood.id === value);
}

export function isSyncedSettingKey(key: string): boolean {
  return (SYNCED_SETTING_KEYS as readonly string[]).includes(key);
}

export function displayNameFromProfile(value: string | null): string | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as { name?: unknown };
    if (typeof parsed.name !== 'string') return null;
    const name = parsed.name.trim();
    return name.length > 0 ? name : null;
  } catch {
    return null;
  }
}

export function stampMillis(iso: string): number {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) throw new Error(`Bad timestamp: ${iso}`);
  return ms;
}
