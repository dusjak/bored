/** Spacing scale, 8px base unit (colors_and_type.css). */
export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28, // min horizontal screen margin
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
  32: 128,
} as const;

export const screenPadding = 28;

export const radius = {
  none: 0,
  small: 4,
  medium: 8,
  large: 16,
  pill: 999,
} as const;

export const shadow = {
  1: {
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  2: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
} as const;

/** Motion: fade only, 400ms default, 800ms for session fade. */
export const motion = {
  fast: 200,
  default: 400,
  slow: 800,
} as const;
