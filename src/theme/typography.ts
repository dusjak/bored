import { DMSans_300Light } from '@expo-google-fonts/dm-sans/300Light';
import { DMSans_300Light_Italic } from '@expo-google-fonts/dm-sans/300Light_Italic';
import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium';
import { DMSans_600SemiBold } from '@expo-google-fonts/dm-sans/600SemiBold';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display/400Regular';
import { DMSerifDisplay_400Regular_Italic } from '@expo-google-fonts/dm-serif-display/400Regular_Italic';
import { DMMono_300Light } from '@expo-google-fonts/dm-mono/300Light';
import { DMMono_400Regular } from '@expo-google-fonts/dm-mono/400Regular';
import type { TextStyle } from 'react-native';

import { colors } from './colors';

/** Fonts loaded in the root layout via expo-font's useFonts. */
export const fontAssets = {
  DMSans_300Light,
  DMSans_300Light_Italic,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSerifDisplay_400Regular,
  DMSerifDisplay_400Regular_Italic,
  DMMono_300Light,
  DMMono_400Regular,
};

/**
 * In React Native each weight is its own font family,
 * so use these instead of fontWeight.
 */
export const fonts = {
  sansLight: 'DMSans_300Light',
  sansLightItalic: 'DMSans_300Light_Italic',
  sans: 'DMSans_400Regular',
  sansMedium: 'DMSans_500Medium',
  sansSemiBold: 'DMSans_600SemiBold',
  serif: 'DMSerifDisplay_400Regular',
  serifItalic: 'DMSerifDisplay_400Regular_Italic',
  monoLight: 'DMMono_300Light',
  mono: 'DMMono_400Regular',
} as const;

/** Converts CSS em tracking to RN letterSpacing (points). */
export const em = (size: number, value: number) => size * value;

/** Semantic text styles (mirrors the classes in the design prototype). */
export const type = {
  // DM Serif Display italic, for emotional moments
  display: (size: number, lineHeight = 1.08): TextStyle => ({
    fontFamily: fonts.serifItalic,
    fontSize: size,
    lineHeight: size * lineHeight,
    letterSpacing: em(size, -0.02),
    color: colors.fg,
  }),
  eyebrow: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    letterSpacing: em(11, 0.08),
    textTransform: 'uppercase',
    color: colors.fgTertiary,
  } as TextStyle,
  body: {
    fontFamily: fonts.sansLight,
    fontSize: 16,
    lineHeight: 16 * 1.65,
    color: colors.fgSecondary,
  } as TextStyle,
  caption: {
    fontFamily: fonts.sansLight,
    fontSize: 14,
    lineHeight: 14 * 1.5,
    color: colors.fgTertiary,
  } as TextStyle,
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.fg,
  } as TextStyle,
  mono: (size: number): TextStyle => ({
    fontFamily: fonts.monoLight,
    fontSize: size,
    letterSpacing: em(size, -0.04),
    fontVariant: ['tabular-nums'],
  }),
};
