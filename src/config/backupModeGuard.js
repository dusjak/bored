/**
 * Plain JS so `app.config.js` can call it without compiling TypeScript.
 * Same rule as `isProductionBuildProfile` in `buildProfile.ts`: only the
 * EAS profile named `production` counts. `testflight` does not.
 */
function isProductionBuildProfile(profile) {
  return profile === 'production';
}

module.exports = { isProductionBuildProfile };
