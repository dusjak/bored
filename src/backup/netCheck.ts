/** Pure reading of a NetInfo snapshot. The fetch itself lives in `net.ts`. */

export function isOffline(state: {
  isConnected: boolean | null;
  isInternetReachable?: boolean | null;
}): boolean {
  if (state.isConnected === false) return true;
  if (state.isInternetReachable === false) return true;
  return false;
}
