import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/Icon';
import { screenPadding, useTheme } from '@/theme';

const ITEMS: Record<string, { label: string; icon: IconName }> = {
  home: { label: 'Hjem', icon: 'clock' },
  log: { label: 'Logg', icon: 'list' },
  profile: { label: 'Deg', icon: 'user' },
};

/**
 * Blur stand-in for the iOS 26 Liquid Glass tab bar.
 * Used below iOS 26, including Expo Go on older systems.
 */
export function GlassTabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 26);
  return (
    <View pointerEvents="box-none" style={[styles.host, { paddingBottom: bottom }]}>
      <View
        style={[
          styles.bar,
          theme.effect.glass,
          {
            height: theme.size['tab-bar'],
            borderRadius: theme.radius.pill,
            borderColor: theme.color.glass.stroke,
          },
        ]}
      >
        <BlurView
          intensity={40}
          tint={theme.name === 'dark' ? 'dark' : 'light'}
          style={[StyleSheet.absoluteFill, { borderRadius: theme.radius.pill }]}
        />
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.color.glass.fill, borderRadius: theme.radius.pill }]}
        />
        {state.routes.map((route, index) => {
          const item = ITEMS[route.name];
          if (!item) return null;
          const focused = state.index === index;
          const color = focused ? theme.color.text.primary : theme.color.text.secondary;
          const onPress = () => {
            const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigateToTab(route.key);
          };
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={item.label}
              style={styles.item}
            >
              <View
                style={[
                  styles.itemInner,
                  focused && { backgroundColor: theme.color.glass.selected, borderRadius: theme.radius.pill },
                ]}
              >
                <Icon name={item.icon} size={theme.size.icon} color={color} />
                <Text style={[theme.text.tab, { color }]}>{item.label}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    // Same side inset as Screen, so the pill stays aligned with screen content.
    paddingHorizontal: screenPadding,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  item: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  itemInner: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 6, gap: 2 },
});
