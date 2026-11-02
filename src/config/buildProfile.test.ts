import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { easBuildProfile, isDevBuild, isProductionBuildProfile } from './buildProfile.ts';

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

describe('build profile', () => {
  it('treats only the production profile as production', () => {
    assert.equal(isProductionBuildProfile('production'), true);
    assert.equal(isProductionBuildProfile('testflight'), false);
    assert.equal(isProductionBuildProfile('preview'), false);
    assert.equal(isProductionBuildProfile('development'), false);
    assert.equal(isProductionBuildProfile(''), false);
    assert.equal(isProductionBuildProfile(undefined), false);
    assert.equal(isProductionBuildProfile(null), false);
  });

  it('reads EAS_BUILD_PROFILE before the public env', () => {
    withEnv(
      {
        EAS_BUILD_PROFILE: 'testflight',
        EXPO_PUBLIC_EAS_BUILD_PROFILE: 'production',
      },
      () => {
        assert.equal(easBuildProfile(), 'testflight');
        assert.equal(isProductionBuildProfile(easBuildProfile()), false);
      },
    );
  });

  it('falls back to EXPO_PUBLIC_EAS_BUILD_PROFILE', () => {
    withEnv(
      {
        EAS_BUILD_PROFILE: undefined,
        EXPO_PUBLIC_EAS_BUILD_PROFILE: 'production',
      },
      () => {
        assert.equal(easBuildProfile(), 'production');
        assert.equal(isProductionBuildProfile(easBuildProfile()), true);
      },
    );
  });

  it('returns null when no profile is set', () => {
    withEnv(
      {
        EAS_BUILD_PROFILE: undefined,
        EXPO_PUBLIC_EAS_BUILD_PROFILE: undefined,
      },
      () => {
        assert.equal(easBuildProfile(), null);
        assert.equal(isProductionBuildProfile(easBuildProfile()), false);
      },
    );
  });

  it('is not a dev build under the node test runner', () => {
    assert.equal(isDevBuild(), false);
  });
});
