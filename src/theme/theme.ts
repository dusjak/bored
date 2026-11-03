/**
 * bored. design tokens v1 – generated from the Figma file "bored." (pages Designsystem + Look & feel – Taktil gjenstand).
 * Source of truth: /workspace/design/tokens/tokens.json. Do not hand-edit; regenerate (see README.md).
 * Names mirror the Figma variables: Figma `color/text/primary` == `theme.color.text.primary` here.
 *
 * Shape: keeps the exports of src/theme (palette, colors, onDark, space, screenPadding, radius,
 * shadow, motion, fonts) so it can replace src/theme/ step by step, and adds `themes`, `ThemePreference`.
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
    'night-60': 'rgba(26,26,24,0.6)',
  },
} as const;

/* ---------- Semantic colors (Figma collection "Semantic", modes Light / Dark) ---------- */
const lightColor = {
  bg: {
    default: prim.neutral['100'],
    session: prim.neutral['950'],
    overlay: prim.alpha['ink-40'],
  },
  surface: {
    default: prim.neutral['50'],
    sheet: prim.neutral['50'],
  },
  text: {
    primary: prim.neutral['900'],
    secondary: prim.neutral['650'],
    tertiary: prim.neutral['600'],
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
  },
  control: {
    off: prim.neutral['250'],
  },
  object: {
    fill: prim.neutral['150'],
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
  },
  tally: {
    default: prim.neutral['900'],
    interrupted: prim.neutral['450'],
  },
} as const;

const darkColor = {
  bg: {
    default: prim.neutral['900'],
    session: prim.neutral['950'],
    overlay: prim.alpha['black-60'],
  },
  surface: {
    default: prim.neutral['850'],
    sheet: prim.neutral['850'],
  },
  text: {
    primary: prim.neutral['50'],
    secondary: prim.neutral['300'],
    tertiary: prim.neutral['400'],
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
  },
  control: {
    off: prim.neutral['700'],
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
export const screenPadding = space[4]; // 16 (HIG). Was space[7] = 28 until 2026-11-01.
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

/* ---------- Typography (Figma text styles type/*) ---------- */
/** React Native: each weight is its own family (names match src/theme/typography.ts fontAssets). */
export const fonts = {
  sansLight: 'DMSans_300Light',
  sansLightItalic: 'DMSans_300Light_Italic',
  sans: 'DMSans_400Regular',
  sansItalic: 'DMSans_400Regular_Italic', // NOTE: not loaded in src/theme/typography.ts yet – add @expo-google-fonts/dm-sans/400Regular_Italic
  sansMedium: 'DMSans_500Medium',
  sansSemiBold: 'DMSans_600SemiBold',
  serif: 'DMSerifDisplay_400Regular',
  serifItalic: 'DMSerifDisplay_400Regular_Italic',
  monoLight: 'DMMono_300Light',
  mono: 'DMMono_400Regular',
  /**
   * Tab labels only, until the typography pass points the rest of `text` at Figtree.
   * Loaded as `Figtree_500Medium` in fontAssets.
   */
  figtreeMedium: 'Figtree_500Medium',
} as const;
/** Color-free text styles; combine with a color from the active theme. */
export const text = {
  display: { fontFamily: fonts.serifItalic, fontSize: 44, lineHeight: 48 } as TextStyle,
  headline: { fontFamily: fonts.serifItalic, fontSize: 28, lineHeight: 32 } as TextStyle,
  bodyLarge: { fontFamily: fonts.sans, fontSize: 18, lineHeight: 28 } as TextStyle,
  body: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 24 } as TextStyle,
  bodySmall: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20 } as TextStyle,
  label: { fontFamily: fonts.sansMedium, fontSize: 15, lineHeight: 20 } as TextStyle,
  labelSmall: { fontFamily: fonts.sansMedium, fontSize: 14, lineHeight: 20 } as TextStyle,
  button: { fontFamily: fonts.sansMedium, fontSize: 16, lineHeight: 24 } as TextStyle,
  eyebrow: { fontFamily: fonts.sansMedium, fontSize: 13, lineHeight: 18 } as TextStyle,
  caption: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 18 } as TextStyle,
  tab: { fontFamily: fonts.figtreeMedium, fontSize: 10, lineHeight: 12 } as TextStyle,
  monoTimer: { fontFamily: fonts.monoLight, fontSize: 88, lineHeight: 96, fontVariant: ['tabular-nums'] } as TextStyle,
  monoHero: { fontFamily: fonts.monoLight, fontSize: 56, lineHeight: 56, fontVariant: ['tabular-nums'] } as TextStyle,
  monoData: { fontFamily: fonts.mono, fontSize: 15, lineHeight: 20, fontVariant: ['tabular-nums'] } as TextStyle,
  monoMeta: { fontFamily: fonts.mono, fontSize: 13, lineHeight: 18, fontVariant: ['tabular-nums'] } as TextStyle,
  note: { fontFamily: fonts.sansItalic, fontSize: 13, lineHeight: 18 } as TextStyle,
};
/**
 * Top inset under the safe area on screens that opened with a title or wordmark.
 * «Logg» was `text.headline` (lineHeight 32) plus `space['6']` (24) under it: 56.
 * That sat on `screenPadding` (16), so the next line started at 72.
 * Welcome, Logg, and Deg use this. Hjem stays on `screenPadding`.
 */
export const screenHeaderInset = screenPadding + Number(text.headline.lineHeight) + space['6'];
/**
 * DM Mono 300 Light line box at `text.monoHero` size (56).
 * Ascender 992, descender −310, unitsPerEm 1000 → ceil(56 × 1.302) = 73.
 * iOS clips a line when `lineHeight` is shorter than that box, which cuts the top of «2».
 * The token stays 56 so Hjem's circle is unchanged. Logg's count uses this.
 */
export const monoHeroFontLineHeight = Math.ceil((56 * (992 - -310)) / 1000);

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
