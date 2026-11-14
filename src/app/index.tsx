import { Redirect, type Href } from 'expo-router';

import { useAppState } from '@/state/AppState';
import { indexRoute } from '@/state/launchRoute';

/** Sends the stored launch target on. The animated splash is an overlay, not this route. */
export default function Index() {
  const { launch, onboarded, reflectionSessionId } = useAppState();
  return <Redirect href={indexRoute({ launch, onboarded, reflectionSessionId }) as Href} />;
}
