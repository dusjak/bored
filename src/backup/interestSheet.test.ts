import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

describe('backup interest sheet', () => {
  it('is the duration sheet, with the new button and no privacy link', () => {
    const root = process.cwd();
    const screen = readFileSync(join(root, 'src/components/backup/BackupInterestScreen.tsx'), 'utf8');
    const profile = readFileSync(join(root, 'src/app/(tabs)/profile/index.tsx'), 'utf8');
    assert.match(screen, /Jeg vil ha en sikkerhetskopi/);
    assert.match(screen, /<Sheet /);
    assert.match(screen, /sheetContentPullUp/);
    assert.match(screen, /backup_screen_viewed/);
    assert.match(screen, /backup_interest_tapped/);
    assert.doesNotMatch(screen, /Personvernerklæring|PRIVACY/);
    assert.doesNotMatch(screen, /Jeg vil ha det/);
    assert.match(profile, /<BackupInterestScreen/);
    assert.doesNotMatch(profile, /router\.push\('\/profile\/backup'\)/);
  });
});
