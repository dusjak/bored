import { useEffect } from 'react';
import { router } from 'expo-router';

import { seedDemoData } from '@/demo/seed';
import { useAppState } from '@/state/AppState';
import { useTheme } from '@/theme';

/**
 * bored://demo and exp://…/--/demo.
 * The seed writes only when `__DEV__` is true. A production or TestFlight
 * build opens Hjem and leaves storage alone.
 */
export default function DemoSeedRoute() {
  const { reloadStoredState } = useAppState();
  const { setPreference } = useTheme();

  useEffect(() => {
    let live = true;
    (async () => {
      const seeded = await seedDemoData();
      if (!live) return;
      if (seeded) {
        await setPreference('light');
        await reloadStoredState();
      }
      router.replace('/home');
    })().catch(() => {
      if (live) router.replace('/home');
    });
    return () => {
      live = false;
    };
  }, [reloadStoredState, setPreference]);

  return null;
}
