import { Redirect } from 'expo-router';

/** The welcome copy is the first screen now. */
export default function Velkommen() {
  return <Redirect href="/onboarding" />;
}
