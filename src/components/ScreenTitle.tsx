import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';

import { useTheme } from '@/theme';
import { screenTitleBox, type TitleAlign } from '@/theme/screenTitle';

type Props = {
  children: string;
  align?: TitleAlign;
  variant?: 'headline' | 'display';
  color?: string;
  style?: StyleProp<TextStyle>;
};

/**
 * Screen title. Stretches to the content column inside the 16pt margin and wraps.
 * Italic side bearings paint into that margin; the glyph origin stays on it.
 * No line limit, so a long name is never cut down to one letter.
 */
export function ScreenTitle({ children, align = 'left', variant = 'headline', color, style }: Props) {
  const { theme } = useTheme();
  const box = screenTitleBox(align);
  const type = variant === 'display' ? theme.text.display : theme.text.headline;
  return (
    <View
      collapsable={false}
      style={[styles.slot, { marginLeft: box.marginLeft, marginRight: box.marginRight }]}
    >
      <Text
        accessibilityRole={children ? 'header' : undefined}
        style={[
          type,
          styles.text,
          {
            color: color ?? theme.color.text.primary,
            textAlign: box.textAlign,
            paddingLeft: box.paddingLeft,
            paddingRight: box.paddingRight,
          },
          style,
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { alignSelf: 'stretch' },
  text: { alignSelf: 'stretch' },
});
