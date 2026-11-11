import type { IntroPath, KlumpMaterialId } from '../data/types.ts';

/**
 * Onboarding, 13 screens. No shaping.
 * Del 1 has no back arrow. The bridge and Del 2 keep the arrow.
 * A swipe never changes step. The guess swipe only changes 5/10/15/20.
 * Stored materials stay in the profile. This flow does not read or write them.
 */

export const BLI_KJENT_STEPS = 7;

/** Del 1. No back arrow. Hopp over exists only on the hold screen. */
export const PART1_ROUTES = ['index', 'kjedomhet', 'tid', 'ov'] as const;

export const KJEDOMHET_BODY =
  'Det er vanskelig å sette ord på, og den kjennes ulik for alle. Her har vi gitt den en form: en klump du tar med deg inn i hver økt.';

export const GUESS_TITLE = 'Velg en tid du klarer';
export const GUESS_HELP = 'Du kan endre den etter hver økt.';
export const GUESS_HINT = 'Sveip for å endre tiden';

export const HOLD_TITLE = 'Du kan alltid bryte økten hvis du blir urolig';
export const HOLD_BODY = 'Uro og tunge tanker kan dukke opp. Vil du ut, holder du inne klumpen.';
export const HOLD_HINT = 'Hold klumpen inne';
/** Fortsett appears by this time even if the hold was never finished. */
export const HOLD_CONTINUE_AFTER_MS = 30_000;

export const FORK_TITLE = 'Nå kan du det viktigste';
export const FORK_BODY =
  'Svar på noen korte spørsmål, så tilpasser vi øktene til deg. Det tar under ett minutt.';

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

/** Fortsett after a finished hold, or once the screen has been open for 30 s. */
export function practiceContinueReady(completed: boolean, elapsedMs: number): boolean {
  return completed || elapsedMs >= HOLD_CONTINUE_AFTER_MS;
}

/** Countdown from the chosen minutes. It does not run ahead of the finger. */
export function holdCountdown(totalMinutes: number, elapsedMs: number): string {
  const total = Math.max(0, totalMinutes) * 60;
  const left = Math.max(0, total - Math.floor(Math.max(0, elapsedMs) / 1000));
  const minutes = Math.floor(left / 60);
  const seconds = left % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** The summary names the person only when they gave a name. No period in the title. */
export function summaryTitle(name: string | undefined): string {
  const trimmed = name?.trim() ?? '';
  return trimmed ? `${trimmed}, la oss starte` : 'La oss starte';
}

/** Skip path has no time and no goal, so the sentence does not invent either. */
export function summaryLead(minutes: number, timePhrase?: string, goalPhrase?: string): string {
  const base = `Du starter med ${minutes} minutter`;
  if (timePhrase && goalPhrase) return `${base} ${timePhrase}, med mål om ${goalPhrase}.`;
  if (timePhrase) return `${base} ${timePhrase}.`;
  if (goalPhrase) return `${base}, med mål om ${goalPhrase}.`;
  return `${base}.`;
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
