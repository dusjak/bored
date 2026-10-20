import { Platform } from 'react-native';
import { ThemeProvider as NavigationThemeProvider, DarkTheme, DefaultTheme } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { GlassTabBar } from '@/components/GlassTabBar';
import { useTheme } from '@/theme';

const iosMajor = Platform.OS === 'ios' ? parseInt(String(Platform.Version), 10) : 0;
/** System Liquid Glass tab bar. iOS 26 draws it; earlier systems use the blur bar. */
const useLiquidGlass = Platform.OS === 'ios' && iosMajor >= 26;

export default function TabsLayout() {
  const { theme } = useTheme();
  if (useLiquidGlass) {
    return (
      <NavigationThemeProvider value={theme.name === 'dark' ? DarkTheme : DefaultTheme}>
        <NativeTabs
          minimizeBehavior="never"
          iconColor={theme.color.text.primary}
          labelStyle={{ fontSize: theme.text.tab.fontSize, fontFamily: theme.fonts.sansMedium }}
        >
          <NativeTabs.Trigger name="home" contentStyle={{ backgroundColor: theme.color.bg.default }}>
            <NativeTabs.Trigger.Label>Hjem</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon sf={{ default: 'clock', selected: 'clock.fill' }} md="schedule" />
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="log" contentStyle={{ backgroundColor: theme.color.bg.default }}>
            <NativeTabs.Trigger.Label>Logg</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon sf="list.bullet" md="list" />
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="profile" contentStyle={{ backgroundColor: theme.color.bg.default }}>
            <NativeTabs.Trigger.Label>Deg</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon sf={{ default: 'person', selected: 'person.fill' }} md="person" />
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
