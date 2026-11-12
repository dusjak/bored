/**
 * One sink for product events. Mixpanel is attached when a token is present.
 * Without `EXPO_PUBLIC_MIXPANEL_TOKEN` every call stays on the phone: a memory
 * list and a local count, and nothing is sent.
 * Note text and the person's name are never properties. `notat` is only
 * whether a note was written. `stemning` is the mood chip id.
 */

export type KnappType = 'Knapp' | 'Stegnavigasjon' | 'Fane' | 'Valg';
export type KnappHendelse = 'trykk' | 'åpner' | 'lukker' | 'submit';
export type OktHendelse = 'start' | 'fullført' | 'avbrutt';
export type OnboardingHendelse = 'vist' | 'fullført';

export type AnalyticsEventName = 'Knappetrykk' | 'Økt' | 'Onboarding';

export type AnalyticsProps = {
  skjerm: string;
  type?: KnappType;
  navn?: string;
  hendelse?: string;
  sekunder?: number;
  notat?: boolean;
  stemning?: string;
};

export type AnalyticsEvent = {
  name: AnalyticsEventName;
  at: string;
  props: AnalyticsProps;
};

type Sink = (event: AnalyticsEvent) => void;

const memory: AnalyticsEvent[] = [];

async function persist(event: AnalyticsEvent) {
  const store = await import('../data/repository.ts');
  const key = `analytics.${event.name}`;
  const raw = await store.getSetting(key);
  const previous = raw ? (JSON.parse(raw) as { count?: number }) : {};
  const count = (previous.count ?? 0) + 1;
  await store.setSetting(key, JSON.stringify({ count, lastAt: event.at }));
}

/** Default sink stores a count locally. Mixpanel is added beside it. */
export let sink: Sink = (event) => {
  void persist(event).catch(() => undefined);
  void import('./mixpanel.ts')
    .then((mod) => mod.sendToMixpanel(event))
    .catch(() => undefined);
};

export function setAnalyticsSink(next: Sink) {
  sink = next;
}

export function trackEvent(name: AnalyticsEventName, props: AnalyticsProps, at = new Date().toISOString()): AnalyticsEvent {
  const event = { name, at, props };
  memory.push(event);
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('[analytics]', name, props);
  sink(event);
  return event;
}

export function knappetrykk(input: {
  type: KnappType;
  navn: string;
  hendelse: KnappHendelse;
  skjerm: string;
  notat?: boolean;
  stemning?: string;
}): AnalyticsEvent {
  return trackEvent('Knappetrykk', {
    type: input.type,
    navn: input.navn,
    hendelse: input.hendelse,
    skjerm: input.skjerm,
    ...(input.notat === undefined ? {} : { notat: input.notat }),
    ...(input.stemning ? { stemning: input.stemning } : {}),
  });
}

/** `navn` is the chosen length, for example «10 min». `sekunder` is the time actually spent. */
export function okt(input: { navn: string; hendelse: OktHendelse; sekunder: number; skjerm: string }): AnalyticsEvent {
  return trackEvent('Økt', {
    navn: input.navn,
    hendelse: input.hendelse,
    sekunder: input.sekunder,
    skjerm: input.skjerm,
  });
}

export function onboardingSpor(input: { navn: string; hendelse: OnboardingHendelse; skjerm: string }): AnalyticsEvent {
  return trackEvent('Onboarding', {
    navn: input.navn,
    hendelse: input.hendelse,
    skjerm: input.skjerm,
  });
}

export function analyticsMemory(): readonly AnalyticsEvent[] {
  return memory;
}

export function durationLabel(minutes: number): string {
  return `${minutes} min`;
}
