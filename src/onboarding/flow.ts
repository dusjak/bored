import type { IntroPath, KlumpMaterialId } from '../data/types.ts';

/**
 * Bli kjent, part 1.
 * Five learning steps after the meeting. A1, Velkommen and Veiskille sit outside that count.
 * Duration is asked here once. Del 2 does not ask it again.
 * The unease box is never part of these screens. Hjem owns the one stored window.
 */

export const BLI_KJENT_STEPS = 5;

export const BLI_STEP = {
  tid: 0,
  rom: 1,
  tekstur: 2,
  form: 3,
  ov: 4,
} as const;

export type BliSkip =
  | { minutes: 10; to: 'velkommen' }
  | { minutes: 10; to: 'rom' }
  | { minutes: number; to: 'velkommen' };

/** A1 skip leaves before a time choice. Tid skip forces 10 and continues to Rom. Later skips keep the confirmed minutes and go to Velkommen. */
export function skipBliKjent(step: 'a1' | 'tid' | 'rom' | 'tekstur' | 'form' | 'ov', confirmedMinutes: number): BliSkip {
  if (step === 'a1') return { minutes: 10, to: 'velkommen' };
  if (step === 'tid') return { minutes: 10, to: 'rom' };
  return { minutes: confirmedMinutes, to: 'velkommen' };
}

export function confirmedMinutes(stored: string | undefined): 5 | 10 | 15 | 20 {
  const n = parseInt(stored ?? '', 10);
  if (n === 5 || n === 10 || n === 15 || n === 20) return n;
  return 10;
}

export function confirmDuration(minutes: number): { minutes: number; to: 'rom' } {
  return { minutes, to: 'rom' };
}

/** «Til velkommen» exists only after the practice hold completes. Hopp over is separate. */
export function practiceWelcomeReady(completed: boolean): boolean {
  return completed;
}

export type EndedSession = {
  id: string;
  status: 'completed' | 'aborted';
  endedAt: string;
};

/**
 * Hjem unease window, from engangslogikk-v3.
 * Del 2: closed box above Start until the first completed session, then gone for good.
 * Skip: no box on the way in. After the first session, the box is on Hjem until the next completed session.
 * An early end is not a completion. `latched` is the stored close, so a restart cannot open it again.
 */
export function homeUneaseState(
  path: IntroPath | undefined,
  ended: readonly EndedSession[],
  latched: boolean,
): { show: boolean; latch: boolean } {
  if (latched || path == null) return { show: false, latch: latched };
  const ordered = [...ended].sort((a, b) => a.endedAt.localeCompare(b.endedAt) || a.id.localeCompare(b.id));
  if (path === 'del2') {
    const completed = ordered.some((session) => session.status === 'completed');
    return completed ? { show: false, latch: true } : { show: true, latch: false };
  }
  if (ordered.length === 0) return { show: false, latch: false };
  const laterCompleted = ordered.slice(1).some((session) => session.status === 'completed');
  return laterCompleted ? { show: false, latch: true } : { show: true, latch: false };
}

export const HOME_UNEASE_TITLE = 'Hvis du blir urolig';
export const HOME_UNEASE_BODY =
  'Uro og tunge tanker kan dukke opp. Du kan alltid avslutte ved å holde inne klumpen din.';

/** Figtree 400 sizes on the stone, from the part-1 text table. */
export function engravedNumberSize(minutes: number): number {
  if (minutes <= 5) return 34;
  if (minutes <= 10) return 48;
  if (minutes <= 15) return 52;
  return 56;
}

export const MATERIAL_ORDER: readonly KlumpMaterialId[] = ['gummi', 'skifer', 'kull', 'emalje', 'floyel'];

/** Texture step. Kull and Plast stay stored, and they are not choices. */
export const VISIBLE_MATERIALS = ['gummi', 'skifer', 'floyel'] as const;
export type VisibleMaterialId = (typeof VISIBLE_MATERIALS)[number];

export function isVisibleMaterial(id: string | undefined): id is VisibleMaterialId {
  return id === 'gummi' || id === 'skifer' || id === 'floyel';
}

/**
 * Unset is Gummi. A stored Kull or Plast id is returned unchanged.
 * `chip` is null for those, so the step does not pretend Gummi was chosen.
 */
export function textureChoice(stored: KlumpMaterialId | undefined): {
  material: KlumpMaterialId;
  chip: VisibleMaterialId | null;
} {
  const material = stored ?? 'gummi';
  return { material, chip: isVisibleMaterial(material) ? material : null };
}

export function defaultMaterial(id: KlumpMaterialId | undefined): KlumpMaterialId {
  return id ?? 'gummi';
}
