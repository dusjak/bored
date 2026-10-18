import { Text, type TextStyle } from 'react-native';

import { colors, em, fonts, onDark } from '@/theme';

type Props = {
  size?: number;
  dark?: boolean;
  /** Serif italic variant used on the splash screen. */
  variant?: 'sans' | 'serif';
  dotColor?: string;
  style?: TextStyle;
};

/**
 * The wordmark: lowercase "bored" with the period in warm sand.
 * Rendered as text (like assets/logo.svg) so it uses the loaded DM fonts.
 */
export function Logo({ size = 22, dark, variant = 'sans', dotColor, style }: Props) {
  const serif = variant === 'serif';
  return (
    <Text
      style={[
        {
          fontFamily: serif ? fonts.serifItalic : fonts.sansLight,
          fontSize: size,
          letterSpacing: em(size, serif ? -0.03 : -0.01),
          color: dark ? onDark.fg : colors.fg,
        },
        style,
      ]}
    >
      bored
      <Text style={{ color: dotColor ?? colors.accent, fontFamily: serif ? fonts.serifItalic : fonts.sans }}>.</Text>
    </Text>
  );
}
