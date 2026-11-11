import { Redirect } from 'expo-router';

/** Texture choice is gone. New profiles stay on gummi. Stored materials are not cleared here. */
export default function TeksturStep() {
  return <Redirect href="/onboarding/form" />;
}
