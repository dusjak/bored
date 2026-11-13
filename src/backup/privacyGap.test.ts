import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { DEG_OFF, DEG_ON, DEG_ON_TEST, DEG_STALE } from './copy.ts';

const require = createRequire(join(process.cwd(), 'package.json'));
const loadAppConfig = require(join(process.cwd(), 'app.config.js')) as (input: {
  config: Record<string, unknown>;
}) => { ios?: { usesAppleSignIn?: boolean }; plugins?: unknown[] };
const appJson = require(join(process.cwd(), 'app.json')) as { expo: Record<string, unknown> };

describe('backup privacy gap', () => {
  it('drops Sign in with Apple, the pushed screen, and the preview menu from this build', () => {
    const root = process.cwd();
    assert.equal(existsSync(join(root, 'src/components/backup/BackupScreen.tsx')), false);
    assert.equal(existsSync(join(root, 'src/components/backup/PreviewStateSheet.tsx')), false);
    assert.equal(existsSync(join(root, 'src/backup/apple.ts')), false);
    assert.equal(existsSync(join(root, 'src/app/(tabs)/log/backup.tsx')), false);
    const config = readFileSync(join(root, 'app.config.js'), 'utf8');
    const pkg = readFileSync(join(root, 'package.json'), 'utf8');
    const profile = readFileSync(join(root, 'src/app/(tabs)/profile/index.tsx'), 'utf8');
    const sheet = readFileSync(join(root, 'src/components/backup/BackupInterestScreen.tsx'), 'utf8');
    assert.doesNotMatch(config, /expo-apple-authentication|usesAppleSignIn/);
    assert.doesNotMatch(pkg, /expo-apple-authentication/);
    assert.doesNotMatch(profile, /PreviewStateSheet|expo-apple-authentication/);
    assert.match(profile, /backup\.mode !== 'fakedoor'/);
    assert.doesNotMatch(sheet, /Personvernerklæring|På \(test\)|Logg på med Apple|AppleAuthentication/);
    const loaded = loadAppConfig({ config: structuredClone(appJson.expo) });
    assert.equal(loaded.ios?.usesAppleSignIn, undefined);
    assert.equal(JSON.stringify(loaded.plugins ?? []).includes('expo-apple-authentication'), false);
    assert.equal(DEG_ON, 'På');
    assert.equal(DEG_ON_TEST, 'På (test)');
    assert.equal(DEG_STALE, 'Ikke oppdatert');
    assert.equal(DEG_OFF, 'Av');
    assert.match(profile, /fakedoor \? <ComingTag/);
  });
});
