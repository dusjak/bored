import type { ReactNode } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme';

type Props = {
  children?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  delayLongPress?: number;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityActions?: { name: string; label: string }[];
  onAccessibilityAction?: (event: AccessibilityActionEvent) => void;
  fill?: string | Animated.AnimatedInterpolation<string>;
  style?: StyleProp<ViewStyle>;
};

/** 176pt matte circle. One outer shadow, plus a 1pt top highlight. */
export function TactileCircle({
  children,
  onPress,
  onLongPress,
  delayLongPress,
  accessibilityLabel,
  accessibilityHint,
  accessibilityActions,
  onAccessibilityAction,
  fill,
  style,
}: Props) {
  const { theme } = useTheme();
  const diameter = theme.size.object;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityActions={accessibilityActions}
      onAccessibilityAction={onAccessibilityAction}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={delayLongPress}
      style={({ pressed }) => [pressed && onPress ? { opacity: 0.92 } : null, style]}
    >
      <Animated.View
        style={[
          styles.circle,
          theme.effect.object,
          {
            width: diameter,
            height: diameter,
            borderRadius: diameter / 2,
            backgroundColor: fill ?? theme.color.object.fill,
          },
        ]}
      >
        <View
          pointerEvents="none"
          style={[
            styles.highlight,
            {
              borderRadius: diameter / 2,
              borderTopColor: theme.color.object.highlight,
            },
          ]}
        />
        {children}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  highlight: {
    ...StyleSheet.absoluteFill,
    borderTopWidth: 1,
  },
});
