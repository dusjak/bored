import Constants from 'expo-constants';

/** EAS profile baked into the manifest by app.config.js. Null outside an EAS build. */
export function easBuildProfile(): string | null {
  const fromPublic = process.env.EXPO_PUBLIC_EAS_BUILD_PROFILE;
  if (typeof fromPublic === 'string' && fromPublic.length > 0) return fromPublic;
  const extra = Constants.expoConfig?.extra as { easBuildProfile?: unknown } | undefined;
  const embedded = extra?.easBuildProfile;
  return typeof embedded === 'string' && embedded.length > 0 ? embedded : null;
}

export function isDevBuild(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true;
}
