/** Visible step titles. The person's name is never one of these. */
const ONBOARDING_STEPS: Record<string, string> = {
  '/onboarding': 'Ingenting er målet',
  '/onboarding/index': 'Ingenting er målet',
  '/onboarding/kjedomhet': 'Hva er kjedsomhet?',
  '/onboarding/tid': 'Velg en tid du klarer',
  '/onboarding/ov': 'Du kan alltid bryte økten hvis du blir urolig',
  '/onboarding/veiskille': 'Nå kan du det viktigste',
  '/onboarding/distraction': 'Hva griper du etter?',
  '/onboarding/state': 'Hvordan er hodet ditt om dagen?',
  '/onboarding/goal': 'Hva vil du ha ut av dette?',
  '/onboarding/duration': 'Hvor lang tid har du?',
  '/onboarding/time': 'Når passer det best?',
  '/onboarding/name': 'Hva skal vi kalle deg?',
  '/onboarding/notifications': 'En stille påminnelse',
  '/onboarding/ready': 'Klar',
};

export function onboardingStepName(pathname: string): string | null {
  return ONBOARDING_STEPS[pathname] ?? null;
}

export function tabName(pathname: string): string | null {
  if (pathname === '/home' || pathname.startsWith('/home/')) return 'Hjem';
  if (pathname === '/log' || pathname.startsWith('/log/')) return 'Logg';
  if (pathname === '/profile' || pathname.startsWith('/profile/')) return 'Deg';
  return null;
}

export type OnboardingBeat = { navn: string; hendelse: 'vist' | 'fullført'; skjerm: string };

/** Forward leaves the previous step as fullført. Back only shows the step again. */
export function onboardingBeats(
  previous: string | null,
  next: string | null,
  direction: 'forward' | 'back',
): OnboardingBeat[] {
  if (!next || next === previous) return [];
  const beats: OnboardingBeat[] = [];
  if (previous && direction === 'forward') {
    beats.push({ navn: previous, hendelse: 'fullført', skjerm: previous });
  }
  beats.push({ navn: next, hendelse: 'vist', skjerm: next });
  return beats;
}

/** A tab press is a change from one tab to another. The first paint is not a press. */
export function tabPress(from: string, to: string): string | null {
  const previous = tabName(from);
  const next = tabName(to);
  if (!previous || !next || previous === next) return null;
  return next;
}
