import { stampMillis, type SyncStamp } from './model.ts';

export type RowPlan = {
  applyRemote: boolean;
  pushLocal: boolean;
};

/**
 * Last-write-wins on `updatedAt`.
 * A newer stamp always wins. Equal stamps do nothing, so a retry is quiet.
 * The exception is an equal stamp where only one side is deleted: the delete wins,
 * so a removal is not resurrected by a copy that never saw it.
 * A remote delete with no local row is already settled and is not applied again.
 * `holdLocal` keeps an in-progress session on the device instead of uploading it.
 */
export function planRow(local: SyncStamp | null, remote: SyncStamp | null, options?: { holdLocal?: boolean }): RowPlan {
  const hold = options?.holdLocal === true;
  if (!local && !remote) return { applyRemote: false, pushLocal: false };
  if (local && !remote) return { applyRemote: false, pushLocal: !hold };
  if (!local && remote) {
    if (remote.deletedAt != null) return { applyRemote: false, pushLocal: false };
    return { applyRemote: true, pushLocal: false };
  }

  const localRow = local as SyncStamp;
  const remoteRow = remote as SyncStamp;
  const localMs = stampMillis(localRow.updatedAt);
  const remoteMs = stampMillis(remoteRow.updatedAt);
  if (remoteMs > localMs) return { applyRemote: true, pushLocal: false };
  if (localMs > remoteMs) return { applyRemote: false, pushLocal: !hold };

  const localDeleted = localRow.deletedAt != null;
  const remoteDeleted = remoteRow.deletedAt != null;
  if (remoteDeleted !== localDeleted) {
    if (remoteDeleted) return { applyRemote: true, pushLocal: false };
    return { applyRemote: false, pushLocal: !hold };
  }
  return { applyRemote: false, pushLocal: false };
}
