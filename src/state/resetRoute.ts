/**
 * Two different actions. They are not the same route.
 *
 * Profil → «Nullstill» wipes sessions, notes, and settings. The copy says the
 * app becomes new. The route after the confirmations is onboarding.
 * `/log` is the Logg list. It is not a screen named Notater.
 *
 * «Avslutt økt» / «Hold for å avslutte» finishes one session and opens the
 * existing note entry, `/reflection`, with that session id. There is no route
 * titled Notater.
 */

export const APP_WIPE_ROUTE = '/onboarding' as const;

export function noteEntryRoute(sessionId: string): { pathname: '/reflection'; params: { sessionId: string } } {
  return { pathname: '/reflection', params: { sessionId } };
}

/** No session and no note handoff in progress. */
export function routeWhenSessionMissing(): '/home' {
  return '/home';
}
