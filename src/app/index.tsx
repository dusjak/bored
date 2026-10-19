import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { Logo } from '@/components/Logo';
import { useAppState } from '@/state/AppState';
import { useTheme } from '@/theme';

/** Splash, then the screen the stored state asks for. No fade and no pulse. */
export default function Splash() {
  const { launch, reflectionSessionId } = useAppState();
  const { theme } = useTheme();
  const resume = launch === 'session' || launch === 'reflection';

  useEffect(() => {
    const delay = resume ? 0 : 1600;
    const timer = setTimeout(() => {
      if (launch === 'session') {
        router.replace('/session');
        return;
      }
      if (launch === 'reflection' && reflectionSessionId) {
        router.replace({ pathname: '/reflection', params: { sessionId: reflectionSessionId } });
        return;
      }
      router.replace(launch === 'home' ? '/home' : '/onboarding');
    }, delay);
    return () => clearTimeout(timer);
  }, [launch, reflectionSessionId, resume]);

  return (
    <View style={[styles.root, { backgroundColor: theme.color.bg.session }]}>
      <StatusBar style="light" />
      <View style={{ alignItems: 'center' }}>
        <Logo variant="serif" size={52} color={theme.color.session['text-primary']} />
        <Text style={[theme.text.caption, styles.tagline, { color: theme.color.session['text-tertiary'] }]}>
          gjør ingenting
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tagline: { marginTop: 12 },
});
