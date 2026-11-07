/**
 * bored. design tokens.
 * Color, space, and radius keep the Figma names: `color/text/primary` == `theme.color.text.primary`.
 * Type is system F (2026-11-03). Faces load only in src/theme/fonts.ts.
 * src/theme/tokens.json mirrors these type roles.
 *
 * DM Serif Display: display (hero) and quotes.
 * Figtree: UI, body, and numbers. Body is Regular (400). Light (300) is only the timer and the hero number.
 */
import type { TextStyle, ViewStyle } from 'react-native';

/* ---------- Primitives (Figma collection "Primitives") ---------- */
const prim = {
  neutral: {
    '0': '#FFFFFF',
    '50': '#F8F6F2',
    '100': '#F0EDE7',
    '150': '#EAE6DF',
    '200': '#DCD7CF',
    '250': '#D6D3CE',
    '300': '#ADA9A2',
    '400': '#9A968F',
    '450': '#8A8781',
    '500': '#7A7873',
    '600': '#66635D',
    '650': '#55524D',
    '700': '#4A4945',
    '800': '#2B2A27',
    '850': '#1A1A18',
    '900': '#111110',
    '950': '#0A0A09',
  },
  sand: {
    '400': '#C4B09A',
    /** Links on a light surface. 5.0:1 on #F8F6F2, 4.6:1 on #F0EDE7. */
    '700': '#7D6650',
  },
  red: {
    '700': '#9F2D2D',
    '200': '#FFB4AB',
  },
  alpha: {
    'ink-24': 'rgba(17,17,16,0.24)',
    'ink-18': 'rgba(17,17,16,0.18)',
    'ink-40': 'rgba(17,17,16,0.4)',
    'white-8': 'rgba(255,255,255,0.08)',
    'white-12': 'rgba(255,255,255,0.12)',
    'white-16': 'rgba(255,255,255,0.16)',
    'white-24': 'rgba(255,255,255,0.24)',
    'white-35': 'rgba(255,255,255,0.35)',
    'white-70': 'rgba(255,255,255,0.7)',
    'black-6': 'rgba(0,0,0,0.06)',
    'black-30': 'rgba(0,0,0,0.3)',
    'black-50': 'rgba(0,0,0,0.5)',
    'black-60': 'rgba(0,0,0,0.6)',
    'warm-8': 'rgba(60,50,40,0.08)',
    'warm-12': 'rgba(60,50,40,0.12)',
    'warm-22': 'rgba(60,50,40,0.22)',
    'night-60': 'rgba(26,26,24,0.6)',
    /** Off-white at 8% and 10%. Hairlines and the time-wheel band on a dark card. */
    'paper-8': 'rgba(248,246,242,0.08)',
    'paper-10': 'rgba(248,246,242,0.10)',
    'ink-6': 'rgba(17,17,16,0.06)',
  },
} as const;

/* ---------- Semantic colors (Figma collection "Semantic", modes Light / Dark) ---------- */
const lightColor = {
  bg: {
    default: prim.neutral['100'],
    /** Deg canvas. Matches the v2.2 frame (#F8F6F2). Other screens keep bg.default. */
    grouped: prim.neutral['50'],
    session: prim.neutral['950'],
    overlay: prim.alpha['ink-40'],
  },
  surface: {
    default: prim.neutral['50'],
    /** Inset grouped cards on Deg. White in light, the same card as surface.default in dark. */
    grouped: prim.neutral['0'],
    sheet: prim.neutral['50'],
  },
  text: {
    primary: prim.neutral['900'],
    secondary: prim.neutral['650'],
    tertiary: prim.neutral['600'],
    /** Sand link. Light uses sand.700 so it clears 4.5:1. Dark keeps sand.400. */
    link: prim.sand['700'],
    /** Lowest weight. Version line. */
    meta: prim.neutral['600'],
    destructive: prim.red['700'],
    'on-ink': prim.neutral['50'],
  },
  ink: {
    default: prim.neutral['900'],
  },
  accent: {
    default: prim.sand['400'],
  },
  border: {
    default: prim.neutral['200'],
    strong: prim.alpha['ink-24'],
    /** Hairline between rows in one group. 0.5pt, inset 16. */
    separator: prim.neutral['200'],
  },
  icon: {
    /** Chevron. Graphic, not text: neutral.300 on light, neutral.600 on dark. */
    chevron: prim.neutral['300'],
  },
  control: {
    off: prim.neutral['250'],
    /** Off knob. Light adds a warm shadow in the switch, not here. */
    offKnob: prim.neutral['0'],
    on: prim.neutral['900'],
    onKnob: prim.neutral['50'],
    /**
     * 1pt off-track border. The fill is 1.5:1 on a white card (WCAG 1.4.11 wants 3:1).
     * neutral.300 is 2.3:1. neutral.450 is 3.6:1 on white and 3.1:1 on the page.
     */
    offBorder: prim.neutral['450'],
    capsule: prim.neutral['150'],
    band: prim.alpha['ink-6'],
  },
  object: {
    /** Approved object black. The S6 wordmark dot is not this token. */
    fill: prim.neutral['900'],
    content: prim.neutral['800'],
    highlight: prim.alpha['white-70'],
    shade: prim.alpha['black-6'],
    shadow: prim.alpha['warm-12'],
    'shadow-near': prim.alpha['warm-8'],
  },
  glass: {
    fill: prim.alpha['white-35'],
    stroke: prim.alpha['white-70'],
    selected: prim.alpha['white-70'],
    shadow: prim.alpha['warm-12'],
  },
  button: {
    'primary-bg': prim.neutral['900'],
    'primary-text': prim.neutral['50'],
    'tertiary-bg': prim.neutral['150'],
    'tertiary-text': prim.neutral['900'],
    'ghost-text': prim.neutral['650'],
  },
  session: {
    'text-primary': prim.neutral['50'],
    'text-secondary': prim.neutral['300'],
    'text-tertiary': prim.neutral['400'],
    decorative: prim.neutral['700'],
    object: prim.neutral['850'],
    /** Rest contour around the session Klumpen. */
    'ring-track': prim.neutral['600'],
  },
  /**
   * Warm light shared by the hold contour and the lock-button bulge.
   * `amber` is #E8C98E. `matte` is the bulge before the glow ramps.
   */
  glow: {
    core: '#F6EBD6',
    amber: '#E8C98E',
    highlight: prim.alpha['white-35'],
    /** Increase Contrast and Reduce Transparency. Solid stroke, no blur. */
    solid: prim.neutral['50'],
    /** Bulge surface before the glow ramps. */
    matte: '#D8CCB6',
  },
  tally: {
    default: prim.neutral['900'],
    interrupted: prim.neutral['450'],
  },
} as const;

const darkColor = {
  bg: {
    default: prim.neutral['900'],
    grouped: prim.neutral['900'],
    session: prim.neutral['950'],
    /** Sheet scrim. 0.40, same dim as the shared sheet (#111110 at 40%). */
    overlay: prim.alpha['ink-40'],
  },
  surface: {
    default: prim.neutral['850'],
    grouped: prim.neutral['850'],
    sheet: prim.neutral['850'],
  },
  text: {
    primary: prim.neutral['50'],
    secondary: prim.neutral['300'],
    tertiary: prim.neutral['400'],
    link: prim.sand['400'],
    meta: prim.neutral['450'],
    destructive: prim.red['200'],
    'on-ink': prim.neutral['900'],
  },
  ink: {
    default: prim.neutral['50'],
  },
  accent: {
    default: prim.sand['400'],
  },
  border: {
    default: prim.neutral['800'],
    strong: prim.alpha['white-24'],
    /** Off-white at 10% on the dark card. Reads as #30302E over #1A1A18. */
    separator: prim.alpha['paper-10'],
  },
  icon: {
    chevron: prim.neutral['600'],
  },
  control: {
    off: prim.neutral['700'],
    offKnob: prim.neutral['850'],
    on: prim.neutral['50'],
    onKnob: prim.neutral['900'],
    /**
     * 1pt off-track border. The fill (#4A4945) is 1.9:1 on the card.
     * neutral.600 is 2.9:1, still short. neutral.500 is 3.9:1.
     */
    offBorder: prim.neutral['500'],
    capsule: prim.neutral['800'],
    band: prim.alpha['paper-8'],
  },
  object: {
    fill: prim.neutral['850'],
    content: prim.neutral['250'],
    highlight: prim.alpha['white-8'],
    shade: prim.alpha['black-50'],
    shadow: prim.alpha['black-30'],
    'shadow-near': prim.alpha['black-30'],
  },
  glass: {
    fill: prim.alpha['night-60'],
    stroke: prim.alpha['white-12'],
    selected: prim.alpha['white-16'],
    shadow: prim.alpha['black-50'],
  },
  button: {
    'primary-bg': prim.neutral['50'],
    'primary-text': prim.neutral['900'],
    'tertiary-bg': prim.neutral['800'],
    'tertiary-text': prim.neutral['50'],
    'ghost-text': prim.neutral['300'],
  },
  session: {
    'text-primary': prim.neutral['50'],
    'text-secondary': prim.neutral['300'],
    'text-tertiary': prim.neutral['400'],
    decorative: prim.neutral['700'],
    object: prim.neutral['850'],
    /** Rest contour around the session Klumpen. */
    'ring-track': prim.neutral['600'],
  },
  /**
   * Same on both themes. The session screen is always dark.
   */
  glow: {
    core: '#F6EBD6',
    amber: '#E8C98E',
    highlight: prim.alpha['white-35'],
    solid: prim.neutral['50'],
    matte: '#D8CCB6',
  },
  tally: {
    default: prim.neutral['50'],
    interrupted: prim.neutral['500'],
  },
} as const;

export type ThemeName = 'light' | 'dark';
/** Stored user preference. Default 'system' (Automatisk, follows the phone). Was 'light' until 2026-11-01. */
export type ThemePreference = 'light' | 'dark' | 'system';
export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'system';
export type ColorTokens = { [G in keyof typeof lightColor]: { [K in keyof (typeof lightColor)[G]]: string } };

/* ---------- Dimensions (Figma "Primitives": space/*, radius/*, size/*) ---------- */
export const space = {
  '1': 4,
  '2': 8,
  '3': 12,
  '4': 16,
  '6': 24,
  '7': 28,
  '8': 32,
  '10': 40,
  '12': 48,
  '16': 64,
  '24': 96,
  '32': 128,
} as const;
/** Side inset. 24pt. Was 28 (2026-10-21), then 16 (2026-11-01). Layout v2.1. */
export const screenPadding = space['6'];
export const radius = {
  none: 0,
  small: 4,
  medium: 8,
  large: 16,
  pill: 999,
} as const;
export const size = {
  object: 176,
  button: {
    comfort: 56,
    regular: 48,
    compact: 36,
  },
  'tab-bar': 64,
  icon: 24,
  'hit-min': 44,
} as const;

/* ---------- Typography (system F) ---------- */
/**
 * Each weight is its own family (the keys of fontAssets).
 * Do not also set fontWeight: on iOS that asks the family for a face and can leave the Light cut.
 * Body text is `fonts.sans` (Figtree Regular, 400). `fonts.sansLight` is 300 and is not body text.
 * `fonts.sansMedium` is Figtree Medium, including tab labels.
 */
export const fonts = {
  sansLight: 'Figtree_300Light',
  sans: 'Figtree_400Regular',
  sansMedium: 'Figtree_500Medium',
  sansSemiBold: 'Figtree_600SemiBold',
  serif: 'DMSerifDisplay_400Regular',
  serifItalic: 'DMSerifDisplay_400Regular_Italic',
} as const;
/** OpenType tnum. Figtree ships it. Put it on number readouts, not on prose. */
export const tabularNums: TextStyle['fontVariant'] = ['tabular-nums'];
/**
 * Color-free text styles. Combine with a color from the active theme.
 * Roles follow system F. Keys already used by screens stay, so a parallel tab-bar change
 * can keep reading `fonts.sansMedium`, `text.tab`, and the number styles.
 *
 * display   hero      DM Serif Display Italic 30/34, tracking −2%
 * headline  title     DM Serif Display Italic 28/32
 * body                Figtree Regular 16/24
 * bodySmall           Figtree Regular 14/20
 * bodyLarge           Figtree Regular 18/28 (log count word, name field)
 * label               Figtree Medium 15/20
 * labelSmall chip     Figtree Medium 14/20
 * button              Figtree Medium 16/24
 * eyebrow             Figtree Medium 13/18
 * caption             Figtree Regular 13/18
 * tab                 Figtree Medium 10/12
 * monoTimer timer     Figtree Light 88/96, tabular-nums
 * monoHero  hero num  Figtree Light 56/56, tabular-nums
 * monoData  data      Figtree Medium 15/20, tabular-nums
 * monoMeta  meta      Figtree Regular 13/18, tabular-nums
 * note      quote     DM Serif Display Italic 15/20
 */
export const text = {
  display: { fontFamily: fonts.serifItalic, fontSize: 30, lineHeight: 34, letterSpacing: -0.6 } as TextStyle,
  headline: { fontFamily: fonts.serifItalic, fontSize: 28, lineHeight: 32 } as TextStyle,
  bodyLarge: { fontFamily: fonts.sans, fontSize: 18, lineHeight: 28 } as TextStyle,
  body: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 24 } as TextStyle,
  bodySmall: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20 } as TextStyle,
  label: { fontFamily: fonts.sansMedium, fontSize: 15, lineHeight: 20 } as TextStyle,
  labelSmall: { fontFamily: fonts.sansMedium, fontSize: 14, lineHeight: 20 } as TextStyle,
  button: { fontFamily: fonts.sansMedium, fontSize: 16, lineHeight: 24 } as TextStyle,
  eyebrow: { fontFamily: fonts.sansMedium, fontSize: 13, lineHeight: 18 } as TextStyle,
  caption: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 18 } as TextStyle,
  tab: { fontFamily: fonts.sansMedium, fontSize: 10, lineHeight: 12 } as TextStyle,
  monoTimer: { fontFamily: fonts.sansLight, fontSize: 88, lineHeight: 96, fontVariant: tabularNums } as TextStyle,
  monoHero: { fontFamily: fonts.sansLight, fontSize: 56, lineHeight: 56, fontVariant: tabularNums } as TextStyle,
  monoData: { fontFamily: fonts.sansMedium, fontSize: 15, lineHeight: 20, fontVariant: tabularNums } as TextStyle,
  monoMeta: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 18, fontVariant: tabularNums } as TextStyle,
  note: { fontFamily: fonts.serifItalic, fontSize: 15, lineHeight: 20 } as TextStyle,
};
/**
 * Figtree Light line box at `text.monoHero` size (56).
 * OS/2 useTypoMetrics is on: typo ascender 950, descender −250, unitsPerEm 1000.
 * ceil(56 × 1.2) = 68.
 * iOS clips a line when `lineHeight` is shorter than that box, which cuts the top of «2».
 * The token stays 56 so Hjem's circle is unchanged. Logg's count uses this.
 * Screen tops are `screenTopInset` and `welcomeTopInset` in layout.ts, not a header inset.
 */
export const monoHeroFontLineHeight = Math.ceil((56 * (950 - -250)) / 1000);

/* ---------- Effects (Figma effect styles effect/object/*, effect/glass/*) ---------- */
/** RN can render one shadow per view: use the soft drop shadow; highlight/shade need an inner overlay (e.g. a 1px top border or LinearGradient-free inset View). */
const objectShadow = (c: ColorTokens): ViewStyle => ({ shadowColor: c.object.shadow, shadowOpacity: 1, shadowRadius: 24, shadowOffset: { width: 0, height: 24 }, elevation: 8 });
const glassShadow = (c: ColorTokens): ViewStyle => ({ shadowColor: c.glass.shadow, shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 6 });
/** Glass blur: expo-blur <BlurView intensity={40} tint={scheme === 'dark' ? 'dark' : 'light'} /> + color.glass.fill on top. */
export const glassBlurRadius = 20;

/* ---------- Motion ---------- */
export const motion = {
  fast: 200,
  default: 400,
  slow: 800, // session start fade, session-end Smart Animate (ease-out, no bounce)
  sessionEndDelay: 600,
  completionHold: 2000,
} as const;

/* ---------- Themes ---------- */
const makeTheme = (name: ThemeName, color: ColorTokens) => ({
  name,
  color,
  space, radius, size, text, fonts, motion,
  effect: { object: objectShadow(color), glass: glassShadow(color) },
  /** expo-status-bar style for this theme (session screen always uses 'light'). */
  statusBar: name === 'dark' ? ('light' as const) : ('dark' as const),
});
export const themes = {
  light: makeTheme('light', lightColor as ColorTokens),
  dark: makeTheme('dark', darkColor as ColorTokens),
};
export type Theme = (typeof themes)['light'];
export const resolveThemeName = (pref: ThemePreference, system: 'light' | 'dark' | null | undefined): ThemeName =>
  pref === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref;

/* ---------- Back-compat with src/theme (light values) ---------- */
/** @deprecated use theme.color.* – kept so existing imports keep compiling. */
export const palette = {
  mono100: prim.neutral[0], mono150: prim.neutral[50], mono200: prim.neutral[100], mono300: prim.neutral[150],
  mono400: prim.neutral[250], mono500: prim.neutral[400], mono600: prim.neutral[400], mono700: prim.neutral[600],
  mono800: prim.neutral[700], mono900: prim.neutral[800], mono950: prim.neutral[850], mono1000: prim.neutral[900],
  accent400: prim.sand[400],
} as const;
/** @deprecated legacy flat keys mapped onto the light theme. */
export const colors = {
  bg: lightColor.bg.default,
  bgSecondary: lightColor.surface.default,
  bgTertiary: lightColor.button['tertiary-bg'],
  bgInverse: lightColor.ink.default,
  bgSession: lightColor.bg.session,
  bgOverlay: lightColor.bg.overlay,
  card: lightColor.surface.default,
  fg: lightColor.text.primary,
  fgSecondary: lightColor.text.secondary,
  fgTertiary: lightColor.text.tertiary,
  fgDisabled: lightColor.text.tertiary,
  fgPlaceholder: lightColor.text.tertiary,
  fgInverse: lightColor.text['on-ink'],
  accent: lightColor.accent.default,
  border: lightColor.border.default,
  borderSubtle: lightColor.border.default,
  borderStrong: lightColor.border.strong,
  borderInverse: prim.alpha['white-12'],
  negative: '#B85C4A',
  positive: '#5A6B3A',
  warning: '#A07828',
} as const;
/** @deprecated session screen colors – use theme.color.session.* */
export const onDark = {
  fg: lightColor.session['text-primary'],
  fg40: lightColor.session['text-secondary'],
  fg20: lightColor.session['text-tertiary'],
  border: prim.alpha['white-8'],
  borderStrong: prim.alpha['white-12'],
} as const;
/** @deprecated use theme.effect.object */
export const shadow = { 1: objectShadow(lightColor as ColorTokens), 2: glassShadow(lightColor as ColorTokens) } as const;
