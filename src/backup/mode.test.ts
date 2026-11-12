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

  it('allows preview for development, preview, testflight, and an unset profile', () => {
    assert.equal(assertBackupMode('preview', 'development'), 'preview');
    assert.equal(assertBackupMode('preview', 'preview'), 'preview');
    assert.equal(assertBackupMode('preview', 'testflight'), 'preview');
    assert.equal(assertBackupMode('preview', undefined), 'preview');
    assert.equal(assertBackupMode('preview', null), 'preview');
  });

  it('allows off, live, and fakedoor on a production build', () => {
    assert.equal(assertBackupMode('off', 'production'), 'off');
    assert.equal(assertBackupMode('live', 'production'), 'live');
    assert.equal(assertBackupMode('fakedoor', 'production'), 'fakedoor');
  });

  it('rejects an unknown mode', () => {
    assert.throws(() => assertBackupMode('yes', undefined), /BACKUP_MODE/);
  });
});
