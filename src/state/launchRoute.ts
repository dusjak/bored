/**
 * Where `/` sends the person. Pure, so a stale launch can be tested without React.
 *
 * A stored onboarding flag wins over the initial launch value `'onboarding'`.
 * That value is the state default, and it used to survive `completeOnboarding`,
 * so a remounted index opened step 1 of onboarding.
 * Nullstill clears the flag and sets launch back to onboarding, which lands here.
 * A restored session, or a reflection that still has its id, is the start route.
 */
import { noteEntryRoute } from './resetRoute.ts';

export type IndexRoute =
  | '/onboarding'
  | '/home'
  | '/session'
  | ReturnType<typeof noteEntryRoute>;

export function indexRoute(input: {
  launch: 'onboarding' | 'home' | 'session' | 'reflection';
  onboarded: boolean;
  reflectionSessionId: string | null;
}): IndexRoute {
  if (input.launch === 'session') return '/session';
  if (input.launch === 'reflection' && input.reflectionSessionId) {
    return noteEntryRoute(input.reflectionSessionId);
  }
  if (!input.onboarded) return '/onboarding';
  return '/home';
}
