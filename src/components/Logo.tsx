import { Text, type TextStyle } from 'react-native';

import { useTheme } from '@/theme';

type Props = {
  size?: number;
  /** Serif italic, used on the splash screen. */
  variant?: 'sans' | 'serif';
  /** Word and period. Defaults to `color.text.primary`. */
  color?: string;
  style?: TextStyle;
};

/**
 * Wordmark. The period uses the same color as the word.
 * The accessibility label is the word, so the stop is not read aloud.
 */
export function Logo({ size = 22, variant = 'sans', color, style }: Props) {
  const { theme } = useTheme();
  const serif = variant === 'serif';
  const markColor = color ?? theme.color.text.primary;
  return (
    <Text
      accessibilityRole="text"
      accessibilityLabel="bored"
      style={[
        {
          fontFamily: serif ? theme.fonts.serifItalic : theme.fonts.sansLight,
          fontSize: size,
          color: markColor,
        },
        style,
      ]}
    >
      bored
      <Text style={{ color: markColor, fontFamily: serif ? theme.fonts.serifItalic : theme.fonts.sans }}>.</Text>
    </Text>
  );
}
