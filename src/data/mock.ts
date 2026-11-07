/**
 * Onboarding copy. Session history lives in the database, not here.
 */

import type { FyllingName } from './fylling.ts';

export type Option = { id: string; label: string; sub?: string; icon?: FyllingName };

export type QuestionKey = 'distraction' | 'state' | 'goal' | 'duration' | 'time';

export type Question = {
  key: QuestionKey;
  step: number; // 0-based, of ONBOARDING_STEPS
  title: string;
  sub: string;
  options: Option[];
  next: string;
  withIcons?: boolean;
};

export const ONBOARDING_STEPS = 7;

export const QUESTIONS: Record<QuestionKey, Question> = {
  distraction: {
    key: 'distraction',
    step: 0,
    title: 'Hva rekker du etter?',
    sub: 'Når det plutselig er 5 ledige minutter.',
    next: '/onboarding/state',
    options: [
      { id: 'phone', label: 'Telefonen', sub: 'Instagram, nyheter, noe — hva som helst' },
      { id: 'podcast', label: 'Musikk eller podkast', sub: 'Lyd fyller stillheten' },
      { id: 'mat', label: 'Mat eller drikke', sub: 'Noe i munnen, noe i hendene' },
      { id: 'work', label: 'Mer jobb', sub: 'Produktivitet som trøst' },
      { id: 'tv', label: 'TV eller serier', sub: 'Noe å stirre på' },
    ],
  },
  state: {
    key: 'state',
    step: 1,
    title: 'Hvordan er hodet ditt om dagen?',
    sub: 'Ingen feil svar.',
    next: '/onboarding/goal',
    options: [
      { id: 'overveldet', label: 'Overveldet', sub: 'For mye på en gang, tankene spinner' },
      { id: 'flat', label: 'Flat og umotivert', sub: 'Ingenting gir energi eller mening' },
      { id: 'ok', label: 'Ganske ok', sub: 'Hverdagen funker, men noe mangler' },
      { id: 'rastlos', label: 'Rastløs', sub: 'Ute av stand til å slappe av' },
      { id: 'bra', label: 'Bra, men vil bli bedre', sub: 'Vil skape rom for dypere tenkning' },
    ],
  },
  goal: {
    key: 'goal',
    step: 2,
    title: 'Hva vil du ha ut av dette?',
    sub: 'Vi tilpasser opplevelsen til deg.',
    next: '/onboarding/duration',
    options: [
      { id: 'ro', label: 'Mental ro', sub: 'Skru av alt, bare hvile' },
      { id: 'kreativitet', label: 'Mer kreativitet', sub: 'La tankene vandre til noe nytt' },
      { id: 'vane', label: 'En daglig vane', sub: 'Et rituale å komme tilbake til' },
      { id: 'autopilot', label: 'Tilstedeværelse', sub: 'Være mer til stede med meg selv' },
      { id: 'nysgjerrig', label: 'Bare nysgjerrig', sub: 'Se hva som skjer' },
    ],
  },
  duration: {
    key: 'duration',
    step: 3,
    title: 'Hvor lang tid har du?',
    sub: 'Du kan endre det når du vil.',
    next: '/onboarding/time',
    options: [
      { id: '5', label: '5 minutter' },
      { id: '10', label: '10 minutter' },
      { id: '15', label: '15 minutter' },
      { id: '20', label: '20 minutter' },
    ],
  },
  time: {
    key: 'time',
    step: 4,
    title: 'Når passer det best?',
    sub: 'Vi sender en stille påminnelse til rett tid.',
    next: '/onboarding/name',
    withIcons: true,
    options: [
      { id: 'morgen', label: 'Morgen', sub: 'Før dagen tar over', icon: 'morgen' },
      { id: 'lunsj', label: 'Midt på dagen', sub: 'En pause i arbeidsdagen', icon: 'lunsj' },
      { id: 'kveld', label: 'Kveld', sub: 'Avslutte dagen med ro', icon: 'kveld' },
      { id: 'varierer', label: 'Varierer', sub: 'Ingen fast rytme ennå', icon: 'varierer' },
    ],
  },
};

export const GOAL_LABELS: Record<string, string> = {
  ro: 'mental ro',
  kreativitet: 'mer kreativitet',
  vane: 'en daglig vane',
  autopilot: 'tilstedeværelse',
  nysgjerrig: 'å utforske',
};

export const TIME_PHRASES: Record<string, string> = {
  morgen: 'om morgenen',
  lunsj: 'midt på dagen',
  kveld: 'om kvelden',
  varierer: 'når det passer',
};

export const NOTIF_TIME_LABELS: Record<string, string> = {
  morgen: 'Kl. 08:00',
  lunsj: 'Kl. 12:30',
  kveld: 'Kl. 20:00',
  varierer: 'Daglig',
};

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Sessions needed before the AI duration suggestion unlocks. */
export const AI_UNLOCK_SESSIONS = 60;
// TODO: real AI insight, this is a hardcoded suggestion
export const MOCK_AI_SUGGESTION_MIN = 14;
