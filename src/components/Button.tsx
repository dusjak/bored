import { Pressable, StyleSheet, Text, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

type Variant = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'outline' | 'inverse' | 'darkGhost';
type Size = 'comfort' | 'regular' | 'compact';

type Props = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  /** Size to the label instead of stretching across the row. */
  hug?: boolean;
};

const PAD: Record<Size, number> = { compact: 16, regular: 24, comfort: 32 };

/**
 * Primary is the ink fill. Secondary is the tinted pill (light #EAE6DF, dark #2B2A27).
 * Tertiary is an underlined text button. Ghost stays grey text.
 * Comfort 56, regular 48, compact 36. Compact adds 4pt of vertical hit slop.
 */
export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'regular',
  disabled,
  accessibilityLabel,
  style,
  textStyle,
  hug = false,
}: Props) {
  const { theme } = useTheme();
  const c = theme.color;
  const height = theme.size.button[size];
  const label = size === 'compact' ? theme.text.labelSmall : theme.text.button;
  const palette: Record<Variant, { box: ViewStyle; text: TextStyle }> = {
    primary: {
      box: { backgroundColor: c.button['primary-bg'] },
      text: { color: c.button['primary-text'] },
    },
    secondary: {
      box: { backgroundColor: c.button['tertiary-bg'] },
      text: { color: c.button['tertiary-text'] },
    },
    tertiary: {
      box: { backgroundColor: 'transparent' },
      text: { color: c.text.primary, textDecorationLine: 'underline', letterSpacing: 0 },
    },
    ghost: {
      box: { backgroundColor: 'transparent' },
      text: { color: c.button['ghost-text'] },
    },
    outline: {
      box: { backgroundColor: 'transparent', borderWidth: 1, borderColor: c.border.strong },
      text: { color: c.text.primary },
    },
    inverse: {
      box: { backgroundColor: c.session['text-primary'] },
      text: { color: c.bg.session },
    },
    darkGhost: {
      box: { backgroundColor: 'transparent' },
      text: { color: c.session['text-tertiary'] },
    },
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={disabled ? { disabled: true } : undefined}
      disabled={disabled}
      hitSlop={size === 'compact' ? { top: 4, bottom: 4 } : undefined}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === 'tertiary' || hug ? styles.hug : styles.full,
        {
          height,
          paddingHorizontal: PAD[size],
          borderRadius: theme.radius.pill,
        },
        palette[variant].box,
        pressed && variant === 'tertiary' && { backgroundColor: c.button['tertiary-bg'] },
        pressed && variant !== 'tertiary' && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text numberOfLines={1} style={[label, palette[variant].text, textStyle]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  full: { width: '100%' },
  hug: { alignSelf: 'center', minWidth: 44 },
  disabled: { opacity: 0.28 },
  pressed: { opacity: 0.6 },
});
