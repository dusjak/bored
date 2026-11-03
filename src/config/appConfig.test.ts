import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, it } from 'node:test';

const require = createRequire(path.join(process.cwd(), 'package.json'));
const loadAppConfig = require('./app.config.js') as (input: {
  config: Record<string, unknown>;
}) => {
  owner?: string;
  extra?: {
    backupMode?: string;
    easBuildProfile?: string;
    eas?: { projectId?: string };
    router?: { asyncRoutes?: { web?: boolean } };
  };
};
const appJson = require('./app.json') as { expo: Record<string, unknown> };

const PROJECT_ID = '6fb5350f-f6a2-4f6b-ae86-05365f76b9ce';

function withEnv(values: Record<string, string | undefined>, run: () => void): void {
  const previous = new Map<string, string | undefined>();
  for (const key of Object.keys(values)) {
    previous.set(key, process.env[key]);
    const next = values[key];
    if (next === undefined) delete process.env[key];
    else process.env[key] = next;
  }
  try {
    run();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function load(): ReturnType<typeof loadAppConfig> {
  return loadAppConfig({ config: structuredClone(appJson.expo) });
}

describe('app config', () => {
  it('keeps the eas project, owner, and router from app.json', () => {
    withEnv(
      {
        BACKUP_MODE: undefined,
        EAS_BUILD_PROFILE: undefined,
        EXPO_PUBLIC_EAS_BUILD_PROFILE: undefined,
      },
      () => {
        const result = load();
        assert.equal(result.owner, 'thekingdule');
        assert.equal(result.extra?.backupMode, 'preview');
        assert.equal(result.extra?.eas?.projectId, PROJECT_ID);
        assert.equal(result.extra?.router?.asyncRoutes?.web, false);
        assert.equal(result.extra?.easBuildProfile, undefined);
      },
    );
  });

  it('bakes a testflight profile without dropping the project id', () => {
    withEnv(
      {
        BACKUP_MODE: undefined,
        EAS_BUILD_PROFILE: 'testflight',
        EXPO_PUBLIC_EAS_BUILD_PROFILE: undefined,
      },
      () => {
        const result = load();
        assert.equal(result.extra?.backupMode, 'preview');
        assert.equal(result.extra?.easBuildProfile, 'testflight');
        assert.equal(result.extra?.eas?.projectId, PROJECT_ID);
        assert.equal(result.owner, 'thekingdule');
      },
    );
  });

  it('rejects preview backup for the production profile and allows off', () => {
    withEnv(
      {
        BACKUP_MODE: undefined,
        EAS_BUILD_PROFILE: 'production',
        EXPO_PUBLIC_EAS_BUILD_PROFILE: undefined,
      },
      () => {
        assert.throws(() => load(), /preview/);
      },
    );
    withEnv(
      {
        BACKUP_MODE: 'off',
        EAS_BUILD_PROFILE: 'production',
        EXPO_PUBLIC_EAS_BUILD_PROFILE: undefined,
      },
      () => {
        const result = load();
        assert.equal(result.extra?.backupMode, 'off');
        assert.equal(result.extra?.easBuildProfile, 'production');
        assert.equal(result.extra?.eas?.projectId, PROJECT_ID);
      },
    );
  });
});
