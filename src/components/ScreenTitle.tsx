import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';

import { useRegisterSheetTitle } from '@/sheet/title';
import { useTheme } from '@/theme';
import { screenTitleBox, screenTitleFamily, type TitleAlign } from '@/theme/screenTitle';

type Props = {
  children: string;
  align?: TitleAlign;
  variant?: 'headline' | 'display';
  color?: string;
  style?: StyleProp<TextStyle>;
};

/**
 * Screen title. Stretches to the content column inside the 24pt margin and wraps.
 * Italic side bearings paint into that margin; the glyph origin stays on it.
 * No line limit, so a long name is never cut down to one letter.
 */
export function ScreenTitle({ children, align = 'left', variant = 'headline', color, style }: Props) {
  const { theme } = useTheme();
  const titleRef = useRegisterSheetTitle();
  const box = screenTitleBox(align);
  const type = variant === 'display' ? theme.text.display : theme.text.headline;
  const family = screenTitleFamily(theme.fonts.serif);
  return (
    <View
      collapsable={false}
      style={[styles.slot, { marginLeft: box.marginLeft, marginRight: box.marginRight }]}
    >
      <Text
        ref={titleRef}
        accessibilityRole={children ? 'header' : undefined}
        style={[
          type,
          { fontFamily: family },
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
