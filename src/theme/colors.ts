/**
 * BORED design tokens — colors.
 * Source: Claude Design export, colors_and_type.css
 */
export const palette = {
  mono100: '#FFFFFF',
  mono150: '#F8F6F2', // warm off-white, primary bg
  mono200: '#F0EDE7',
  mono300: '#E4DFD7',
  mono400: '#D4CEC5',
  mono500: '#B8B0A6',
  mono600: '#9E9285',
  mono700: '#756B60',
  mono800: '#4E463D',
  mono900: '#2A2420',
  mono950: '#1A1612',
  mono1000: '#111110', // near-black, primary fg

  accent100: '#F5EEE5',
  accent200: '#E8D9C5',
  accent300: '#D4BFA0',
  accent400: '#C4B09A', // warm sand, primary accent
  accent500: '#A8906F',
  accent600: '#8B7050',

  negative100: '#F9EEEC',
  negative400: '#B85C4A',
  negative600: '#8C3A28',
  positive100: '#EEF0E8',
  positive400: '#5A6B3A',
  positive600: '#3D4E22',
  warning100: '#F5EFE0',
  warning400: '#A07828',
} as const;

export const colors = {
  // Backgrounds
  bg: palette.mono150,
  bgSecondary: palette.mono200,
  bgTertiary: palette.mono300,
  bgInverse: palette.mono1000,
  bgSession: '#0A0A09',
  bgOverlay: 'rgba(17,17,16,0.45)',
  card: palette.mono100,

  // Foregrounds
  fg: palette.mono1000,
  fgSecondary: palette.mono700,
  fgTertiary: palette.mono600,
  fgDisabled: palette.mono500,
  fgPlaceholder: palette.mono400,
  fgInverse: palette.mono150,
  accent: palette.accent400,

  // Borders
  border: 'rgba(17,17,16,0.12)',
  borderSubtle: 'rgba(17,17,16,0.07)',
  borderStrong: 'rgba(17,17,16,0.22)',
  borderInverse: 'rgba(255,255,255,0.10)',

  // Status
  negative: palette.negative400,
  positive: palette.positive400,
  warning: palette.warning400,
} as const;

/** Inverse/dark text helpers used on session + ready screens. */
export const onDark = {
  fg: palette.mono150,
  fg85: 'rgba(248,246,242,0.85)',
  fg40: 'rgba(248,246,242,0.4)',
  fg35: 'rgba(248,246,242,0.35)',
  fg30: 'rgba(248,246,242,0.3)',
  fg28: 'rgba(248,246,242,0.28)',
  fg20: 'rgba(248,246,242,0.2)',
  fg18: 'rgba(248,246,242,0.18)',
  fg12: 'rgba(248,246,242,0.12)',
  border: 'rgba(255,255,255,0.07)',
  borderStrong: 'rgba(255,255,255,0.10)',
} as const;
