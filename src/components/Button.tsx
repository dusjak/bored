import { Pressable, StyleSheet, Text, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

type Variant = 'primary' | 'tertiary' | 'ghost' | 'outline' | 'inverse' | 'darkGhost';
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
};

/** Pill buttons. Comfort 56, regular 48, compact 36. Compact grows to a 44pt target. */
export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'regular',
  disabled,
  accessibilityLabel,
  style,
  textStyle,
}: Props) {
  const { theme } = useTheme();
  const c = theme.color;
  const height = theme.size.button[size];
  const palette: Record<Variant, { box: ViewStyle; text: TextStyle }> = {
    primary: {
      box: { backgroundColor: c.button['primary-bg'] },
      text: { color: c.button['primary-text'] },
    },
    tertiary: {
      box: { backgroundColor: c.button['tertiary-bg'] },
      text: { color: c.button['tertiary-text'] },
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
      disabled={disabled}
      hitSlop={size === 'compact' ? { top: 4, bottom: 4, left: 4, right: 4 } : undefined}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { height, borderRadius: theme.radius.pill },
        palette[variant].box,
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text style={[theme.text.button, palette[variant].text, textStyle]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.28 },
  pressed: { opacity: 0.6 },
});
