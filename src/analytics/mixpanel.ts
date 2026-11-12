import type { AnalyticsEvent } from './track.ts';

let starting: Promise<void> | null = null;
let ready = false;

/** True after a token has been accepted and init has been asked for. Tests read this. */
export function mixpanelReady(): boolean {
  return ready;
}

function token(): string | undefined {
  const value = process.env.EXPO_PUBLIC_MIXPANEL_TOKEN;
  return value && value.length > 0 ? value : undefined;
}

/**
 * JavaScript mode (`useNative: false`): no native Mixpanel, no IDFA, no ATT.
 * The SDK keeps its own anonymous distinct id. We never call identify.
 * A missing token returns before the package is imported.
 */
async function client() {
  const projectToken = token();
  if (!projectToken) return null;
  if (!starting) {
    starting = (async () => {
      const { Mixpanel } = await import('mixpanel-react-native');
      const mixpanel = new Mixpanel(projectToken, false, false);
      const server = process.env.EXPO_PUBLIC_MIXPANEL_SERVER_URL;
      await mixpanel.init(false, {}, server && server.length > 0 ? server : undefined);
      ready = true;
      (globalThis as { __boredMixpanel?: typeof mixpanel }).__boredMixpanel = mixpanel;
    })().catch(() => {
      starting = null;
      ready = false;
    });
  }
  await starting;
  return (globalThis as { __boredMixpanel?: { track: (name: string, props: Record<string, unknown>) => void } })
    .__boredMixpanel ?? null;
}

export async function sendToMixpanel(event: AnalyticsEvent): Promise<void> {
  if (!token()) return;
  try {
    const mixpanel = await client();
    mixpanel?.track(event.name, event.props);
  } catch {
    // A network or init failure must not surface in the UI.
  }
}
