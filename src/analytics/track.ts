/** Events the backup interest screen records. Mixpanel can replace `sink` later. */
export type AnalyticsEventName = 'backup_screen_viewed' | 'backup_interest_tapped';

export type AnalyticsEvent = {
  name: AnalyticsEventName;
  at: string;
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

/** Default sink stores a count locally. Swap this for Mixpanel without changing call sites. */
export let sink: Sink = (event) => {
  void persist(event).catch(() => undefined);
};

export function setAnalyticsSink(next: Sink) {
  sink = next;
}

export function track(name: AnalyticsEventName, at = new Date().toISOString()): AnalyticsEvent {
  const event = { name, at };
  memory.push(event);
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('[analytics]', name, at);
  sink(event);
  return event;
}

export function analyticsMemory(): readonly AnalyticsEvent[] {
  return memory;
}
