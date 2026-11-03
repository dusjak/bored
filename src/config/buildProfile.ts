/**
 * Which EAS build this binary is.
 *
 * `production` is the only profile that counts as an App Store production build.
 * `testflight` does not: testers keep the honest preview backup and the
 * temporary splash-replay hook. `isSplashReplayEnabled` stays on for every
 * non-empty profile other than `production`, including `testflight`. A release
 * binary whose profile is missing, or whose manifest cannot be read, turns
 * that hook off. Reading the profile never throws.
 *
 * `app.config.js` copies `EAS_BUILD_PROFILE` into `extra.easBuildProfile` and
 * omits the key when it is unset. Expo's serializer turns a `null` value into
 * `{}`, so do not write null.
 *
 * Node tests import this file, and `expo-constants` loads `react-native`, so
 * there is no top-level import. The release bundle still includes the module:
 * `loadExpoConstants` calls `require('expo-constants')` with a string literal,
 * which Metro records as a dependency. An indirect call such as
 * `nodeRequire()('expo-constants')` is invisible to Metro. In a minified
 * bundle that call throws `Requiring unknown module "expo-constants"` and the
 * native bridge aborts the process.
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

export type ExpoConfigExtra = {
  expoConfig?: {
    extra?: {
      easBuildProfile?: unknown;
    };
  } | null;
  default?: ExpoConfigExtra;
};

/** Profile baked into `extra.easBuildProfile`. Null when it is missing or unreadable. */
export function easBuildProfileFromConstants(constants: ExpoConfigExtra | null | undefined): string | null {
  try {
    const embedded = constants?.expoConfig?.extra?.easBuildProfile;
    return typeof embedded === 'string' && embedded.length > 0 ? embedded : null;
  } catch {
    return null;
  }
}

function embeddedEasBuildProfile(): string | null {
  return readEmbeddedEasBuildProfile(loadExpoConstants);
}

/** Null when the loader throws. A missing profile is not a production profile. */
export function readEmbeddedEasBuildProfile(load: () => ExpoConfigExtra | null): string | null {
  try {
    return easBuildProfileFromConstants(load());
  } catch {
    return null;
  }
}

function loadExpoConstants(): ExpoConfigExtra | null {
  // Metro records a direct require('expo-constants'). The Node test runner loads
  // this file as ESM, where `require` is absent, so fall back to Node's loader.
  // A failure means there is no baked profile. Do not rethrow: launch must continue.
  const loaded =
    typeof require === 'function'
      ? (require('expo-constants') as ExpoConfigExtra)
      : (nodeRequire()('expo-constants') as ExpoConfigExtra);
  if (loaded == null || typeof loaded !== 'object') return null;
  return loaded.default ?? loaded;
}

function nodeRequire(): NodeRequire {
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

export function isDevBuild(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true;
}
