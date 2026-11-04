/**
 * Build flags.
 * `sluketAnimation` is the splash kill switch. True plays the spiral.
 * False keeps SluketPlay unloaded and uses the still wordmark.
 * `aiCard` stays off in end-user builds. A dev bundle can turn it on with
 * EXPO_PUBLIC_AI_CARD=1. __DEV__ is unset in node tests, so the default stays false there.
 */
const aiCard =
  typeof __DEV__ !== 'undefined' && __DEV__ === true && process.env.EXPO_PUBLIC_AI_CARD === '1';

export const features = {
  sluketAnimation: true,
  aiCard,
  /**
   * Paint-mix pass (Kubelka–Munk + OKLab) on a 4 pt grid.
   * Flip this off to keep goo only. Low Power Mode keeps the mix,
   * with fewer pebbles and an 8 pt grid.
   */
  sluketColorMix: true,
} as const;

/**
 * TODO: The real existing-account flow replaces this hook.
 * Temporary: «Jeg har allerede en konto» replays the full first-launch Sluket.
 * On in `__DEV__`, and in a non-production EAS profile. Off in a production build,
 * including a release binary whose profile is missing (that must not ship the hook).
 */
export function isSplashReplayEnabled(dev: boolean, easBuildProfile: string | null | undefined): boolean {
  if (dev) return true;
  if (easBuildProfile == null || easBuildProfile === '') return false;
  return easBuildProfile !== 'production';
}
