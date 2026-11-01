import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { assertBackupMode } from './mode.ts';

describe('BACKUP_MODE build check', () => {
  it('rejects preview on an EAS production build', () => {
    assert.throws(
      () => assertBackupMode('preview', 'production'),
      /preview/,
    );
  });

  it('allows preview for development, preview, and an unset profile', () => {
    assert.equal(assertBackupMode('preview', 'development'), 'preview');
    assert.equal(assertBackupMode('preview', 'preview'), 'preview');
    assert.equal(assertBackupMode('preview', undefined), 'preview');
  });

  it('allows off and live on a production build', () => {
    assert.equal(assertBackupMode('off', 'production'), 'off');
    assert.equal(assertBackupMode('live', 'production'), 'live');
  });

  it('rejects an unknown mode', () => {
    assert.throws(() => assertBackupMode('yes', undefined), /BACKUP_MODE/);
  });
});
