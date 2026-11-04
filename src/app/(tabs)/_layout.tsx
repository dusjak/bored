import { Tabs } from 'expo-router/js-tabs';

import { GlassTabBar } from '@/components/GlassTabBar';
import { useTheme } from '@/theme';

/** v6 bar on every OS. The marks are custom, so iOS 26 does not use the system tab bar. */
export default function TabsLayout() {
  const { theme } = useTheme();
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
      <Tabs.Screen name="profile" options={{ sceneStyle: { backgroundColor: theme.color.bg.grouped } }} />
    </Tabs>
  );
}
