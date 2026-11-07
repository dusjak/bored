import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabIcon, type TabIconName } from '@/components/TabIcon';
import { contentColumn, screenPadding, useTheme } from '@/theme';
import { TAB_BAR, TAB_BAR_DARK, TAB_BAR_SHADOW, TAB_PILL_SHADOW, tabBarDarkGlass } from '@/theme/tabBar';

const ITEMS: Record<string, { label: string; icon: TabIconName }> = {
  home: { label: 'Hjem', icon: 'home' },
  log: { label: 'Logg', icon: 'log' },
  profile: { label: 'Deg', icon: 'profile' },
};

/**
 * v6 tab bar. Custom on every iOS version, including 26: Klumpen, the bars,
 * and Deg variant B are not SF Symbols. The state sheet uses the shadowed bar.
 */
export function GlassTabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const barWidth = Math.min(TAB_BAR.width, windowWidth - screenPadding * 2);
  const bottom = Math.max(insets.bottom, TAB_BAR.bottomInset);
  const light = theme.name === 'light';
  const shadow = light
    ? {
        shadowColor: TAB_BAR_SHADOW.color,
        shadowOffset: { width: 0, height: TAB_BAR_SHADOW.offsetY },
        shadowOpacity: TAB_BAR_SHADOW.opacity,
        shadowRadius: TAB_BAR_SHADOW.radius,
        elevation: 12,
      }
    : theme.effect.glass;

  return (
    <View pointerEvents="box-none" style={[styles.host, { paddingHorizontal: screenPadding, paddingBottom: bottom }]}>
      <View
        style={[
          styles.bar,
          contentColumn,
          shadow,
          {
            width: barWidth,
            height: TAB_BAR.height,
            borderRadius: TAB_BAR.radius,
            // Opaque shape so iOS casts the shadow. The glass layer covers it.
            backgroundColor: theme.color.bg.default,
          },
        ]}
      >
        <View
          style={[
            styles.glass,
            { borderRadius: TAB_BAR.radius, borderColor: light ? theme.color.glass.stroke : TAB_BAR_DARK.edge },
          ]}
        >
          <BlurView
            intensity={light ? 40 : TAB_BAR_DARK.blur}
            tint={light ? 'light' : 'dark'}
            style={[StyleSheet.absoluteFill, { borderRadius: TAB_BAR.radius }]}
          />
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: light ? theme.color.glass.fill : tabBarDarkGlass(),
                borderRadius: TAB_BAR.radius,
              },
            ]}
          />
        </View>
        <View style={styles.slots}>
          {state.routes.map((route, index) => {
            const item = ITEMS[route.name];
            if (!item) return null;
            const focused = state.index === index;
            const color = light
              ? focused
                ? theme.color.text.primary
                : theme.color.text.tertiary
              : focused
                ? TAB_BAR_DARK.activeInk
                : TAB_BAR_DARK.inactiveInk;
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
                style={styles.slot}
              >
                <View
                  style={[
                    styles.pill,
                    focused && {
                      backgroundColor: light ? TAB_BAR.activePill : TAB_BAR_DARK.activePill,
                    },
                    focused && light && styles.pillShadow,
                  ]}
                >
                  <TabIcon name={item.icon} active={focused} color={color} />
                  <Text style={[theme.text.tab, { color }]}>{item.label}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
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
    alignItems: 'center',
  },
  bar: {
    justifyContent: 'center',
  },
  glass: {
    ...StyleSheet.absoluteFill,
    borderWidth: 1,
    overflow: 'hidden',
  },
  slots: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: TAB_BAR.insetX,
    gap: TAB_BAR.slotGap,
  },
  slot: { flex: 1, height: TAB_BAR.pillHeight },
  pill: {
    flex: 1,
    height: TAB_BAR.pillHeight,
    borderRadius: TAB_BAR.pillRadius,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  pillShadow: {
    shadowColor: TAB_PILL_SHADOW.color,
    shadowOffset: { width: 0, height: TAB_PILL_SHADOW.offsetY },
    shadowOpacity: TAB_PILL_SHADOW.opacity,
    shadowRadius: TAB_PILL_SHADOW.radius,
    elevation: 2,
  },
});
