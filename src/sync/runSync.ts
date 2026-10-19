import { features } from '@/config/features';
import { openDatabase } from '@/data/db';
import type { AppDatabase } from '@/data/sessionQueries';
import { getSupabase } from '@/lib/supabase';
import { syncWithTransport } from '@/sync/engine';
import { isMood, type RemoteSession, type RemoteSetting, type SyncReport, type SyncTransport } from '@/sync/model';

export type SyncRunResult = SyncReport | { status: 'error'; message: string };

/**
 * Pushes and pulls one backup. Returns immediately when sync is off or nobody is signed in.
 * Startup, onboarding, and Nullstill do not call this.
 */
export async function runSync(): Promise<SyncRunResult> {
  if (!features.backendSync) return { status: 'disabled' };
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.getSession();
    if (error) return { status: 'error', message: error.message };
    const userId = data.session?.user.id;
    if (!userId) return { status: 'signed-out' };
    const db = (await openDatabase()) as unknown as AppDatabase;
    return await syncWithTransport(db, supabaseTransport(supabase), { mode: 'ready', userId });
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Sync failed' };
  }
}

type SessionWire = {
  id: string;
  chosen_duration_seconds: number;
  actual_duration_seconds: number;
  status: string;
  started_at: string;
  ended_at: string | null;
  mood: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type SettingWire = {
  key: string;
  value: string;
  updated_at: string;
  deleted_at: string | null;
};

function supabaseTransport(supabase: ReturnType<typeof getSupabase>): SyncTransport {
  return {
    async pullSessions() {
      const { data, error } = await supabase.from('sessions').select(
        'id, chosen_duration_seconds, actual_duration_seconds, status, started_at, ended_at, mood, note, created_at, updated_at, deleted_at',
      );
      if (error) throw new Error(error.message);
      return ((data ?? []) as SessionWire[]).map(sessionFromWire);
    },
    async pullSettings() {
      const { data, error } = await supabase.from('settings').select('key, value, updated_at, deleted_at');
      if (error) throw new Error(error.message);
      return ((data ?? []) as SettingWire[]).map(settingFromWire);
    },
    async upsertSessions(rows) {
      for (const row of rows) {
        const { error } = await supabase.rpc('upsert_session', {
          p_id: row.id,
          p_chosen_duration_seconds: row.chosenDurationSeconds,
          p_actual_duration_seconds: row.actualDurationSeconds,
          p_status: row.status,
          p_started_at: row.startedAt,
          p_ended_at: row.endedAt,
          p_mood: row.mood,
          p_note: row.note,
          p_created_at: row.createdAt,
          p_updated_at: row.updatedAt,
          p_deleted_at: row.deletedAt,
        });
        if (error) throw new Error(error.message);
      }
    },
    async upsertSettings(rows) {
      for (const row of rows) {
        const { error } = await supabase.rpc('upsert_setting', {
          p_key: row.key,
          p_value: row.value,
          p_updated_at: row.updatedAt,
          p_deleted_at: row.deletedAt,
        });
        if (error) throw new Error(error.message);
      }
    },
    async upsertProfile(input) {
      const { error } = await supabase.rpc('upsert_profile', {
        p_display_name: input.displayName,
        p_updated_at: input.updatedAt,
      });
      if (error) throw new Error(error.message);
    },
  };
}

function sessionFromWire(row: SessionWire): RemoteSession {
  if (row.status !== 'active' && row.status !== 'completed' && row.status !== 'aborted') {
    throw new Error(`Unknown session status: ${row.status}`);
  }
  return {
    id: row.id,
    chosenDurationSeconds: row.chosen_duration_seconds,
    actualDurationSeconds: row.actual_duration_seconds,
    status: row.status,
    startedAt: requireIso(row.started_at),
    endedAt: optionalIso(row.ended_at),
    mood: isMood(row.mood) ? row.mood : null,
    note: row.note ?? '',
    createdAt: requireIso(row.created_at),
    updatedAt: requireIso(row.updated_at),
    deletedAt: optionalIso(row.deleted_at),
  };
}

function settingFromWire(row: SettingWire): RemoteSetting {
  return {
    key: row.key,
    value: row.value,
    updatedAt: requireIso(row.updated_at),
    deletedAt: optionalIso(row.deleted_at),
  };
}

function requireIso(value: string): string {
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) throw new Error(`Bad timestamp: ${value}`);
  return new Date(ms).toISOString();
}

function optionalIso(value: string | null): string | null {
  if (value == null) return null;
  return requireIso(value);
}
