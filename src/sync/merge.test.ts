import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { planRow } from './merge.ts';
import { displayNameFromProfile, type SyncStamp } from './model.ts';

function stamp(updatedAt: string, deletedAt: string | null = null): SyncStamp {
  return { updatedAt, deletedAt };
}

describe('last-write-wins merge', () => {
  it('uploads a local row the server has never seen', () => {
    assert.deepEqual(planRow(stamp('2026-10-18T12:00:00.000Z'), null), { applyRemote: false, pushLocal: true });
  });

  it('downloads a remote row this phone does not have', () => {
    assert.deepEqual(planRow(null, stamp('2026-10-18T12:00:00.000Z')), { applyRemote: true, pushLocal: false });
  });

  it('lets the newer stamp win', () => {
    const local = stamp('2026-10-18T12:00:00.000Z');
    const remote = stamp('2026-10-18T13:00:00.000Z');
    assert.deepEqual(planRow(local, remote), { applyRemote: true, pushLocal: false });
    assert.deepEqual(planRow(remote, local), { applyRemote: false, pushLocal: true });
  });

  it('does nothing when the stamps match, so a retry does not ping-pong', () => {
    const row = stamp('2026-10-18T12:00:00.000Z');
    assert.deepEqual(planRow(row, row), { applyRemote: false, pushLocal: false });
    assert.deepEqual(planRow(row, { ...row }), { applyRemote: false, pushLocal: false });
  });

  it('lets a delete win when the stamps are equal', () => {
    const live = stamp('2026-10-18T12:00:00.000Z');
    const deleted = stamp('2026-10-18T12:00:00.000Z', '2026-10-18T12:00:00.000Z');
    assert.deepEqual(planRow(live, deleted), { applyRemote: true, pushLocal: false });
    assert.deepEqual(planRow(deleted, live), { applyRemote: false, pushLocal: true });
  });

  it('applies a newer remote soft delete and pushes a newer local delete', () => {
    const live = stamp('2026-10-18T12:00:00.000Z');
    const deleted = stamp('2026-10-18T13:00:00.000Z', '2026-10-18T13:00:00.000Z');
    assert.deepEqual(planRow(live, deleted), { applyRemote: true, pushLocal: false });
    assert.deepEqual(planRow(deleted, live), { applyRemote: false, pushLocal: true });
  });

  it('does not apply a remote delete that this phone has already removed', () => {
    assert.deepEqual(planRow(null, stamp('2026-10-18T12:00:00.000Z', '2026-10-18T12:00:00.000Z')), {
      applyRemote: false,
      pushLocal: false,
    });
  });

  it('holds an in-progress local session instead of uploading it', () => {
    assert.deepEqual(planRow(stamp('2026-10-18T12:00:00.000Z'), null, { holdLocal: true }), {
      applyRemote: false,
      pushLocal: false,
    });
    assert.deepEqual(
      planRow(stamp('2026-10-18T13:00:00.000Z'), stamp('2026-10-18T12:00:00.000Z'), { holdLocal: true }),
      { applyRemote: false, pushLocal: false },
    );
  });

  it('still accepts a newer remote row while a local session is in progress', () => {
    assert.deepEqual(
      planRow(stamp('2026-10-18T12:00:00.000Z'), stamp('2026-10-18T13:00:00.000Z'), { holdLocal: true }),
      { applyRemote: true, pushLocal: false },
    );
  });

  it('reads a display name from the profile setting', () => {
    assert.equal(displayNameFromProfile('{"name":" Ada "}'), 'Ada');
    assert.equal(displayNameFromProfile('{"name":"  "}'), null);
    assert.equal(displayNameFromProfile('not json'), null);
    assert.equal(displayNameFromProfile(null), null);
  });
});
