export type MaterialPhase = 'pending' | 'live' | 'fallback';

export type MaterialStatus = {
  phase: MaterialPhase;
  reason: string;
};

const statuses = new Map<string, MaterialStatus>();
const warned = new Set<string>();

/** No on-screen text. A fallback is a console warning the tests can also read. */
export function reportMaterialStatus(surface: string, status: MaterialStatus): void {
  statuses.set(surface, status);
  if (status.phase !== 'fallback') return;
  const key = `${surface}:${status.reason}`;
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`[bored:material] ${surface} fallback: ${status.reason}`);
}

export function readMaterialStatus(surface: string): MaterialStatus | null {
  return statuses.get(surface) ?? null;
}

export function resetMaterialStatusForTests(): void {
  statuses.clear();
  warned.clear();
}
