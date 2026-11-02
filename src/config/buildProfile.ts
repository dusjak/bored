/**
 * Which EAS build this binary is.
 *
 * `production` is the only profile that counts as an App Store production build.
 * `testflight` does not: testers keep the honest preview backup (PR #6) and the
 * temporary splash-replay hook. `isSplashReplayEnabled` stays on for every
 * non-empty profile other than `production`, including `testflight`. A release
 * binary whose profile is missing still turns that hook off.
 *
 * PR #6 should call `isProductionBuildProfile(process.env.EAS_BUILD_PROFILE)`
 * from `assertBackupMode` instead of comparing the profile to `'production'`
 * itself. Importing this file from `app.config.ts` is safe because
 * `expo-constants` is loaded only when `easBuildProfile()` needs the manifest.
 * Do not add a top-level import of `expo-constants` here.
 *
 * `app.config.js` copies `EAS_BUILD_PROFILE` into `extra.easBuildProfile` and
 * omits the key when it is unset. Expo's serializer turns a `null` value into
 * `{}`, so do not write null. When PR #6's `app.config.ts` is present, Expo
 * loads that file instead of `app.config.js`, so the `.ts` config has to copy
 * `easBuildProfile` the same way.
 */

export const PRODUCTION_EAS_PROFILE = 'production' as const;

/** True only for the EAS `production` profile. `testflight` and `preview` are not production. */
export function isProductionBuildProfile(profile: string | null | undefined): boolean {
  return profile === PRODUCTION_EAS_PROFILE;
}

function nonEmpty(value: string | undefined): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * EAS profile for this process. Null outside an EAS build.
 * `EAS_BUILD_PROFILE` is set while EAS evaluates config and runs the build.
 * A release binary reads `extra.easBuildProfile`, which `app.config.js` copies
 * from that variable, because Metro does not inline `EAS_BUILD_PROFILE`.
 */
export function easBuildProfile(): string | null {
  const fromEas = nonEmpty(process.env.EAS_BUILD_PROFILE);
  if (fromEas) return fromEas;
  const fromPublic = nonEmpty(process.env.EXPO_PUBLIC_EAS_BUILD_PROFILE);
  if (fromPublic) return fromPublic;
  return embeddedEasBuildProfile();
}

type ExpoConfigExtra = {
  expoConfig?: {
    extra?: {
      easBuildProfile?: unknown;
    };
  } | null;
};

function embeddedEasBuildProfile(): string | null {
  let loaded: ExpoConfigExtra & { default?: ExpoConfigExtra };
  try {
    // Metro provides require. The Node test runner loads this file as ESM, so
    // fall back to Node's module loader there. A missing native module means
    // there is no baked profile (config eval and unit tests).
    loaded = nodeRequire()('expo-constants') as ExpoConfigExtra & { default?: ExpoConfigExtra };
  } catch (error) {
    if (isModuleNotFound(error)) return null;
    throw error;
  }
  const constants = loaded.default ?? loaded;
  const embedded = constants.expoConfig?.extra?.easBuildProfile;
  return typeof embedded === 'string' && embedded.length > 0 ? embedded : null;
}

function nodeRequire(): NodeRequire {
  if (typeof require === 'function') return require;
  const getBuiltin = process.getBuiltinModule;
  if (typeof getBuiltin !== 'function') {
    throw new Error('expo-constants is not available in this runtime.');
  }
  const builtin = getBuiltin('module') as { createRequire?: (filename: string) => NodeRequire } | undefined;
  if (!builtin?.createRequire) {
    throw new Error('expo-constants is not available in this runtime.');
  }
  return builtin.createRequire(`${process.cwd()}/package.json`);
}

function isModuleNotFound(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) return false;
  return error.code === 'MODULE_NOT_FOUND' || error.code === 'ERR_MODULE_NOT_FOUND';
}

export function isDevBuild(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true;
}
