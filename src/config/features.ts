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
} as const;
