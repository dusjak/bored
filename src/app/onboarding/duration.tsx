import { Redirect } from 'expo-router';

/** Duration is chosen once in Bli kjent. Del 2 does not ask again. */
export default function DurationStep() {
  return <Redirect href="/onboarding/time" />;
}
