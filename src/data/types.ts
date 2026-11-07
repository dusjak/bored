/** User-facing session outcome. `active` is only the in-progress row. */
export type SessionStatus = 'active' | 'completed' | 'aborted';

export type SessionRecord = {
  id: string;
  /** Duration the user picked, in seconds. */
  chosenDurationSeconds: number;
  /** Time actually spent, in seconds. Equals the chosen duration when completed. */
  actualDurationSeconds: number;
  status: SessionStatus;
  /** ISO-8601. */
  startedAt: string;
  /** ISO-8601. Null while the session is still active. */
  endedAt: string | null;
  /** ISO-8601. Last time the app left the foreground during this session. */
  backgroundedAt: string | null;
  notificationId: string | null;
  createdAt: string;
  updatedAt: string;
};

export const MOODS = [
  { id: 'restless', label: 'rastløs' },
  { id: 'neutral', label: 'nøytral' },
  { id: 'calm', label: 'rolig' },
  { id: 'clear', label: 'klar' },
  { id: 'deep', label: 'dyp' },
] as const;

export type MoodId = (typeof MOODS)[number]['id'];

export type JournalRecord = {
  id: string;
  sessionId: string;
  mood: MoodId | null;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type SessionWithJournal = SessionRecord & {
  journal: JournalRecord | null;
};

export type KlumpMaterialId = 'gummi' | 'skifer' | 'kull' | 'emalje' | 'floyel';

/** Which way the user left Veiskille. The Hjem unease window reads this. */
export type IntroPath = 'del2' | 'skip';

export type OnboardingProfile = {
  distraction?: string;
  state?: string;
  goal?: string;
  duration?: string;
  time?: string;
  name?: string;
  notifications?: boolean;
  /** "HH:MM", minute 00–59. Unset means the onboarding answer in `time`. */
  reminderClock?: string;
  materialId?: KlumpMaterialId;
  /** Radial offsets, one per form bin, kept per material for this pass. */
  forms?: Partial<Record<KlumpMaterialId, number[]>>;
  introPath?: IntroPath;
};
