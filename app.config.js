/**
 * Expo loads app.json first and passes it as `config`. Spreading it keeps those
 * values, including the native splash. This file adds the backup flag and Sign
 * in with Apple, and copies the EAS profile into `extra` so a release binary
 * can tell production from preview.
 *
 * `EAS_BUILD_PROFILE` exists while EAS evaluates this file. It is not in the
 * Metro bundle unless it is copied here. Omit `easBuildProfile` when it is
 * unset. Expo's serializer turns a null value into `{}`.
 *
 * `BACKUP_MODE=preview` is the TestFlight default. It throws only for the
 * `production` profile. `testflight` is allowed.
 */
const { isProductionBuildProfile } = require('./src/config/backupModeGuard.js');

const BACKUP_MODES = ['off', 'preview', 'live'];

module.exports = ({ config }) => {
  const backupMode = process.env.BACKUP_MODE ?? 'preview';
  if (!BACKUP_MODES.includes(backupMode)) {
    throw new Error(`BACKUP_MODE must be 'off', 'preview', or 'live'. Received '${backupMode}'.`);
  }
  const easBuildProfile = process.env.EAS_BUILD_PROFILE ?? process.env.EXPO_PUBLIC_EAS_BUILD_PROFILE;
  if (backupMode === 'preview' && isProductionBuildProfile(easBuildProfile)) {
    throw new Error(
      "BACKUP_MODE 'preview' cannot ship when EAS_BUILD_PROFILE is 'production'. Use 'off' or 'live'.",
    );
  }

  const extra = {
    ...config.extra,
    backupMode,
  };
  if (typeof easBuildProfile === 'string' && easBuildProfile.length > 0) {
    extra.easBuildProfile = easBuildProfile;
  }

  const plugins = Array.isArray(config.plugins) ? [...config.plugins] : [];
  const hasApple = plugins.some(
    (plugin) =>
      plugin === 'expo-apple-authentication' ||
      (Array.isArray(plugin) && plugin[0] === 'expo-apple-authentication'),
  );
  if (!hasApple) plugins.push('expo-apple-authentication');

  return {
    ...config,
    ios: {
      ...config.ios,
      usesAppleSignIn: true,
    },
    plugins,
    extra,
  };
};
