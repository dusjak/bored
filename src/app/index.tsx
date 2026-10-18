import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { Logo } from '@/components/Logo';
import { useAppState } from '@/state/AppState';
import { useTheme } from '@/theme';

/** Splash, then the screen the stored state asks for. */
export default function Splash() {
  const { launch, reflectionSessionId } = useAppState();
  const { theme } = useTheme();
  const fade = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const resume = launch === 'session' || launch === 'reflection';

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    if (!resume) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      ).start();
    }
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
  }, [fade, pulse, launch, reflectionSessionId, resume]);

  return (
    <View style={[styles.root, { backgroundColor: theme.color.bg.session }]}>
      <StatusBar style="light" />
      <Animated.View style={{ alignItems: 'center', opacity: fade }}>
        <Animated.View
          style={{
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.9] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) }],
          }}
        >
          <Logo variant="serif" size={52} color={theme.color.session['text-primary']} />
        </Animated.View>
        <Text style={[theme.text.caption, styles.tagline, { color: theme.color.session['text-tertiary'] }]}>
          gjør ingenting
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tagline: { marginTop: 12 },
});
