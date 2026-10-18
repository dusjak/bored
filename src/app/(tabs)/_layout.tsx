import { Tabs } from 'expo-router/js-tabs';

import { NavBar } from '@/components/NavBar';
import { colors } from '@/theme';

/** Main app: 3 tabs (Hjem, Logg, Deg) with the custom design tab bar. */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <NavBar {...props} />}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="log" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
