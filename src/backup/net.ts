import NetInfo from '@react-native-community/netinfo';

import { isOffline } from '@/backup/netCheck';

export { isOffline };

/** Real reachability check used before Nullstill, Slett konto, and Koble til Apple. */
export async function deviceIsOnline(): Promise<boolean> {
  try {
    return !isOffline(await NetInfo.fetch());
  } catch {
    return true;
  }
}
