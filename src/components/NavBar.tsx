import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, em, fonts } from '@/theme';
import { Icon, type IconName } from './Icon';

const ITEMS: Record<string, { label: string; icon: IconName }> = {
  home: { label: 'Hjem', icon: 'timer' },
  log: { label: 'Logg', icon: 'chart' },
  profile: { label: 'Deg', icon: 'user' },
};

/** Custom tab bar matching the design: icon + label, inactive at 38% opacity. */
export function NavBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {state.routes.map((route, index) => {
        const item = ITEMS[route.name];
        if (!item) return null;
        const focused = state.index === index;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };
        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            style={[styles.item, { opacity: focused ? 1 : 0.38 }]}
          >
            <Icon name={item.icon} size={22} color={colors.fg} />
            <Text style={styles.label}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    paddingTop: 10,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(17,17,16,0.08)',
  },
  item: { alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 14 },
  label: { fontFamily: fonts.sansMedium, fontSize: 10, letterSpacing: em(10, 0.02), color: colors.fg },
});
