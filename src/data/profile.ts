import type { OnboardingProfile } from '@/data/types';

/** Id used before «Tilstedeværelse» was renamed. Stored profiles are rewritten on read. */
export const LEGACY_GOAL_ID = 'ensomhet';
export const GOAL_PRESENCE_ID = 'autopilot';

/** Rewrites a stored onboarding goal id. Other answers stay as they are. */
export function migrateProfile(profile: OnboardingProfile): { profile: OnboardingProfile; changed: boolean } {
  if (profile.goal !== LEGACY_GOAL_ID) return { profile, changed: false };
  return { profile: { ...profile, goal: GOAL_PRESENCE_ID }, changed: true };
}
