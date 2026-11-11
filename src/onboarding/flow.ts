import type { IntroPath, KlumpMaterialId } from '../data/types.ts';

/**
 * Onboarding, 16 screens.
 * Del 1 has no back arrow. Del 2 keeps the arrow. Neither stack accepts a swipe.
 * Gummi is the material for a profile that has not chosen one. Stored materials stay.
 * The unease box on Hjem is separate from the practice screen.
 */

export const BLI_KJENT_STEPS = 7;

/** Stone width while the person shapes and guesses. It does not grow with the minutes. */
export const FORM_STONE_PT = 200;

/**
 * Del 1 routes. No back arrow and no skip, except the hold and the screen after it.
 * The stack gesture is off for every onboarding route, not only these.
 */
export const PART1_ROUTES = ['index', 'kjedomhet', 'form', 'se', 'tid', 'ov', 'alltid'] as const;

export const KJEDOMHET_BODY =
  'Ingen er helt enige. Her blir din kjedsomhet en klump. Form den slik du kjenner den, så har du den med deg i hver økt.';

export const FORM_TITLE = 'Gi den din form';
export const FORM_HELP = 'Dra i kantene. Det finnes ingen riktig fasong.';

export const SE_TITLE = 'Sånn ser kjedsomheten din ut';
export const SE_BODY =
  'Dette er klumpen din. Den holder tiden mens du kjeder deg, så du slipper å se på mobilen.';

export const GUESS_TITLE = 'Hvor lenge klarer du å kjede deg, tror du?';
export const GUESS_HELP = 'Bare gjett. Du kan endre det etter hver økt.';
export const GUESS_HINT = 'Sveip for å endre tiden';

export const HOLD_TITLE = 'Du kan alltid bryte økten hvis du blir urolig';
export const HOLD_BODY = 'Uro og tunge tanker kan dukke opp. Vil du ut, holder du inne klumpen.';
export const HOLD_HINT = 'Hold klumpen inne';

export const DONE_TITLE = 'Du bestemmer. Alltid.';
export const DONE_BODY = 'Du avsluttet øvingen. Like enkelt er det i en ekte økt.';

export const FORK_TITLE = 'Vil du ha litt hjelp før første økt?';
export const FORK_BODY =
  'Svar på noen korte spørsmål, så lager vi en plan som passer deg. Det tar et par minutter.';

export const DURATION_LIST_TITLE = 'Hvor lang tid har du?';
export const DURATION_LIST_HELP = 'Vi starter her. Du kan alltid endre det.';

export const DURATION_LIST = [
  { minutes: 5, label: '5 minutter', sub: 'En kort, daglig dose ingenting' },
  { minutes: 10, label: '10 minutter', sub: 'Standardenheten for stillhet' },
  { minutes: 15, label: '15 minutter', sub: 'Nok tid til å virkelig lande' },
  { minutes: 20, label: '20 minutter', sub: 'Du mener alvor' },
] as const;

/** Words in the reminder preview. Ten stays «Ti minutter». */
export function durationPreviewLead(minutes: number): string {
  if (minutes === 5) return 'Fem minutter';
  if (minutes === 15) return 'Femten minutter';
  if (minutes === 20) return 'Tjue minutter';
  return 'Ti minutter';
}

export function confirmedMinutes(stored: string | undefined): 5 | 10 | 15 | 20 {
  const n = parseInt(stored ?? '', 10);
  if (n === 5 || n === 10 || n === 15 || n === 20) return n;
  return 10;
}

export function confirmDuration(minutes: number): { minutes: number; to: 'ov' } {
  return { minutes, to: 'ov' };
}

/** «Til velkommen» exists only after the practice hold completes. */
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
