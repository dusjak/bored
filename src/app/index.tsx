import { Redirect, type Href } from 'expo-router';

import { useAppState } from '@/state/AppState';

/** Sends the stored launch target on. The animated splash is an overlay, not this route. */
export default function Index() {
  const { launch, reflectionSessionId } = useAppState();
  if (launch === 'session') return <Redirect href="/session" />;
  if (launch === 'reflection' && reflectionSessionId) {
    return <Redirect href={{ pathname: '/reflection', params: { sessionId: reflectionSessionId } } as Href} />;
  }
  return <Redirect href={launch === 'home' ? '/home' : '/onboarding'} />;
}
