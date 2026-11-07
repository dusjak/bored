import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { PRIVACY, PRIVACY_LINK_GAP } from './copy.ts';

describe('backup privacy link', () => {
  it('keeps a 4pt gap above the existing Personvernerklæring link', () => {
    assert.equal(PRIVACY, 'Personvernerklæring');
    assert.equal(PRIVACY_LINK_GAP, 4);
    const screen = readFileSync(join(process.cwd(), 'src/components/backup/BackupScreen.tsx'), 'utf8');
    assert.match(screen, /marginTop: PRIVACY_LINK_GAP/);
    assert.doesNotMatch(screen, /profile\/privacy|PersonvernScreen/);
  });
});
