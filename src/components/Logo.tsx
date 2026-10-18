import { Text, type TextStyle } from 'react-native';

import { useTheme } from '@/theme';

type Props = {
  size?: number;
  /** Serif italic, used on the splash screen. */
  variant?: 'sans' | 'serif';
  color?: string;
  /** Defaults to sand. Pass another color when the mark must stay quiet. */
  dotColor?: string;
  style?: TextStyle;
};

/**
 * Wordmark. Sand is used only for the full stop.
 * The accessibility label is the word, so the stop is not read aloud.
 */
export function Logo({ size = 22, variant = 'sans', color, dotColor, style }: Props) {
  const { theme } = useTheme();
  const serif = variant === 'serif';
  return (
    <Text
      accessibilityRole="text"
      accessibilityLabel="bored"
      style={[
        {
          fontFamily: serif ? theme.fonts.serifItalic : theme.fonts.sansLight,
          fontSize: size,
          color: color ?? theme.color.text.primary,
        },
        style,
      ]}
    >
      bored
      <Text style={{ color: dotColor ?? theme.color.accent.default, fontFamily: serif ? theme.fonts.serifItalic : theme.fonts.sans }}>
        .
      </Text>
    </Text>
  );
}
