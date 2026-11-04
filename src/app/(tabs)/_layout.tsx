import { Platform } from 'react-native';
import { ThemeProvider as NavigationThemeProvider, DarkTheme, DefaultTheme } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { NativeTabs } from 'expo-router/native-tabs';

import { GlassTabBar } from '@/components/GlassTabBar';
import { useTheme } from '@/theme';

const hjem = {
  default: require('../../../assets/tabs/hjem.png'),
  selected: require('../../../assets/tabs/hjem-fill.png'),
};
const logg = {
  default: require('../../../assets/tabs/logg.png'),
  selected: require('../../../assets/tabs/logg-fill.png'),
};
const deg = {
  default: require('../../../assets/tabs/deg.png'),
  selected: require('../../../assets/tabs/deg-fill.png'),
};

/**
 * iOS uses the system tab bar. The marks stay the v6 Klumpen, bars, and Deg,
 * drawn as template images so the bar tints them. Other platforms keep the blur bar.
 */
export default function TabsLayout() {
  const { theme } = useTheme();
  if (Platform.OS === 'ios') {
    const background = theme.color.bg.default;
    return (
      <NavigationThemeProvider value={theme.name === 'dark' ? DarkTheme : DefaultTheme}>
        <NativeTabs
          minimizeBehavior="never"
          iconColor={{ default: theme.color.text.tertiary, selected: theme.color.text.primary }}
          labelStyle={{ fontSize: theme.text.tab.fontSize, fontFamily: theme.text.tab.fontFamily }}
        >
          <NativeTabs.Trigger name="home" contentStyle={{ backgroundColor: background }}>
            <NativeTabs.Trigger.Label>Hjem</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon src={hjem} renderingMode="template" />
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="log" contentStyle={{ backgroundColor: background }}>
            <NativeTabs.Trigger.Label>Logg</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon src={logg} renderingMode="template" />
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="profile" contentStyle={{ backgroundColor: background }}>
            <NativeTabs.Trigger.Label>Deg</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon src={deg} renderingMode="template" />
          </NativeTabs.Trigger>
        </NativeTabs>
      </NavigationThemeProvider>
    );
  }

  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        animation: 'none',
        sceneStyle: { backgroundColor: theme.color.bg.default },
      }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="log" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
