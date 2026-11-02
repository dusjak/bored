/**
 * Expo loads app.json first and passes it as `config`. Spreading it keeps those
 * values, and copies the EAS profile into `extra` so a release binary can tell
 * production from preview. `EAS_BUILD_PROFILE` exists while EAS evaluates this
 * file. It is not in the Metro bundle unless it is copied here.
 */
module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    easBuildProfile: process.env.EAS_BUILD_PROFILE ?? process.env.EXPO_PUBLIC_EAS_BUILD_PROFILE ?? null,
  },
});
