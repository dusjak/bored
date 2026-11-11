import type { KlumpMaterialId } from '../data/types.ts';

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
/** Shown once the practice hold has finished. Same sand as the ingress. */
export const PRACTICE_DONE = 'Avsluttet der';
/** One size for the practice digits, including the running clock. */
export const PRACTICE_DIGIT_SIZE = 48;
/** Fortsett appears by this time even if the hold was never finished. */
export const HOLD_CONTINUE_AFTER_MS = 30_000;

export const FORK_TITLE = 'Nå kan du det viktigste';
export const FORK_LEAD = 'Vil du at vi tilpasser øktene til deg?';
export const FORK_BODY =
  'Svar på noen korte spørsmål først, så tilpasser vi øktene til deg. Det tar under ett minutt.';

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

/** Countdown from the chosen minutes. The practice screen starts it when the step opens. */
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

/** Notification card. The name is omitted when they skipped it. */
export function reminderPreviewBody(name: string | undefined, minutes: number): string {
  const who = name?.trim() ?? '';
  const lead = who ? `${who}, ${minutes} minutter` : `${minutes} minutter`;
  return `${lead}. Ingenting skjer her. Det er poenget.`;
}

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
