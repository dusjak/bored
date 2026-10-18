/**
 * Mock data and static copy for the skeleton.
 * TODO: replace with real persistence/backend when the data model is defined.
 */

export type Mood = 'rastløs' | 'nøytral' | 'rolig' | 'klar' | 'dyp';

export const MOODS: Mood[] = ['rastløs', 'nøytral', 'rolig', 'klar', 'dyp'];

export const MOOD_COLORS: Record<Mood, string> = {
  rastløs: '#B85C4A',
  nøytral: '#9E9285',
  rolig: '#5A6B3A',
  klar: '#C4B09A',
  dyp: '#111110',
};

/** A completed session with its reflection (journal entry). */
export type SessionEntry = {
  id: string;
  date: Date;
  minutes: number;
  mood: Mood | null;
  note: string;
};

const daysAgo = (d: number, h: number, m: number) => {
  const date = new Date();
  date.setDate(date.getDate() - d);
  date.setHours(h, m, 0, 0);
  return date;
};

// TODO: mock journal entries, replace with stored sessions
export const MOCK_SESSIONS: SessionEntry[] = [
  { id: 's5', date: daysAgo(0, 8, 30), minutes: 10, mood: 'rolig', note: 'Tenkte på turen hjem og hvorfor jeg alltid tar den lange veien.' },
  { id: 's4', date: daysAgo(1, 9, 15), minutes: 12, mood: 'klar', note: 'Hodet ble helt blankt. Første gang.' },
  { id: 's3', date: daysAgo(3, 7, 50), minutes: 5, mood: 'rastløs', note: '' },
  { id: 's2', date: daysAgo(4, 14, 0), minutes: 15, mood: 'dyp', note: 'Husket en drøm fra for mange år siden.' },
  { id: 's1', date: daysAgo(5, 10, 0), minutes: 10, mood: 'nøytral', note: 'Tankene vandret til barndomshjemmet.' },
];

// TODO: mock aggregate stats, should be derived from the full session history
export const MOCK_STATS = {
  streakDays: 6,
  recordStreak: 21,
  historicSessions: 23, // sessions before the ones in MOCK_SESSIONS
  memberSince: 'mai 2026',
};

/** Sessions needed before the AI duration suggestion unlocks. */
export const AI_UNLOCK_SESSIONS = 60;
// TODO: real AI insight, this is a hardcoded suggestion
export const MOCK_AI_SUGGESTION_MIN = 14;

export const WEEKDAYS = ['ma', 'ti', 'on', 'to', 'fr', 'lø', 'sø'];

// ─── Onboarding ─────────────────────────────────────────────

export type Option = { id: string; label: string; sub: string; icon?: string };

export type OnboardingData = {
  distraction?: string;
  state?: string;
  goal?: string;
  duration?: string;
  time?: string;
  name?: string;
  notifications?: boolean;
};

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
      { id: 'ensomhet', label: 'Tilstedeværelse', sub: 'Være mer til stede med meg selv' },
      { id: 'nysgjerrig', label: 'Bare nysgjerrig', sub: 'Se hva som skjer' },
    ],
  },
  duration: {
    key: 'duration',
    step: 3,
    title: 'Hvor lang tid har du?',
    sub: 'Vi starter her. Du kan alltid endre det.',
    next: '/onboarding/time',
    options: [
      { id: '5', label: '5 minutter', sub: 'En kort, daglig dose ingenting' },
      { id: '10', label: '10 minutter', sub: 'Standardenheten for stillhet' },
      { id: '15', label: '15 minutter', sub: 'Nok tid til å virkelig lande' },
      { id: '20', label: '20 minutter', sub: 'Du mener alvor' },
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
      { id: 'morgen', label: 'Morgen', sub: 'Før dagen tar over', icon: '○' },
      { id: 'lunsj', label: 'Midt på dagen', sub: 'En pause i arbeidsdagen', icon: '◑' },
      { id: 'kveld', label: 'Kveld', sub: 'Avslutte dagen med ro', icon: '●' },
      { id: 'varierer', label: 'Varierer', sub: 'Ingen fast rytme ennå', icon: '◌' },
    ],
  },
};

export const GOAL_LABELS: Record<string, string> = {
  ro: 'mental ro',
  kreativitet: 'mer kreativitet',
  vane: 'en daglig vane',
  ensomhet: 'tilstedeværelse',
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

export const REMINDER_CLOCK: Record<string, string> = {
  morgen: '08:00',
  lunsj: '12:30',
  kveld: '20:00',
  varierer: 'Av',
};

export const HOME_ROUTINE: Record<string, string> = {
  morgen: 'morgenrutinen din',
  kveld: 'kveldsrutinen din',
  lunsj: 'lunsjpausen din',
};

// ─── Formatting helpers ────────────────────────────────────

const WEEKDAY_SHORT = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'];

const pad = (n: number) => String(n).padStart(2, '0');

/** "I dag, 08:30" / "I går, 09:15" / "Man, 07:50" */
export function formatSessionDate(date: Date): string {
  const today = new Date();
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOf(today) - startOf(date)) / 86_400_000);
  const clock = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  if (diffDays === 0) return `I dag, ${clock}`;
  if (diffDays === 1) return `I går, ${clock}`;
  return `${WEEKDAY_SHORT[date.getDay()]}, ${clock}`;
}

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
