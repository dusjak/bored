import { Pressable, StyleSheet, Text, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { colors, em, fonts, onDark } from '@/theme';

type Variant = 'primary' | 'ghost' | 'outline' | 'inverse' | 'darkOutline' | 'darkGhost';

type Props = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

/** Full-width, 0-radius buttons from the BORED component vocabulary. */
export function Button({ title, onPress, variant = 'primary', disabled, style, textStyle }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant].box,
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.text, variantStyles[variant].text, textStyle]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    paddingVertical: 17,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: fonts.sansMedium,
    fontSize: 16,
    letterSpacing: em(16, -0.01),
  },
  disabled: { opacity: 0.28 },
  pressed: { opacity: 0.6, transform: [{ scale: 0.98 }] },
});

const variantStyles: Record<Variant, { box: ViewStyle; text: TextStyle }> = {
  primary: { box: { backgroundColor: colors.fg }, text: { color: colors.fgInverse } },
  ghost: {
    box: { backgroundColor: 'transparent', paddingVertical: 12 },
    text: { color: colors.fgTertiary, fontFamily: fonts.sans, fontSize: 14 },
  },
  outline: {
    box: { borderWidth: 1, borderColor: colors.borderStrong },
    text: { color: colors.fg },
  },
  inverse: { box: { backgroundColor: onDark.fg }, text: { color: colors.fg } },
  darkOutline: {
    box: { borderWidth: 1, borderColor: onDark.borderStrong, paddingVertical: 11 },
    text: { color: onDark.fg35, fontFamily: fonts.sans, fontSize: 13 },
  },
  darkGhost: {
    box: { backgroundColor: 'transparent', paddingVertical: 12 },
    text: { color: onDark.fg28, fontFamily: fonts.sans, fontSize: 13 },
  },
};
