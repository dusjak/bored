import { forwardRef, type ReactNode } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type HostInstance,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme';

type Props = {
  children?: ReactNode;
  onPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
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
export const TactileCircle = forwardRef<HostInstance, Props>(function TactileCircle({
  children,
  onPress,
  onPressIn,
  onPressOut,
  onLongPress,
  delayLongPress,
  accessibilityLabel,
  accessibilityHint,
  accessibilityActions,
  onAccessibilityAction,
  fill,
  style,
}, ref) {
  const { theme } = useTheme();
  const diameter = theme.size.object;
  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityActions={accessibilityActions}
      onAccessibilityAction={onAccessibilityAction}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
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
});

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  highlight: {
    ...StyleSheet.absoluteFill,
    borderTopWidth: 1,
  },
});
