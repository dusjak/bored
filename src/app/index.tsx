import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { Logo } from '@/components/Logo';
import { useAppState } from '@/state/AppState';
import { colors, em, fonts, onDark } from '@/theme';

/** Splash: pulsing serif wordmark, then onboarding (or home if already onboarded). */
export default function Splash() {
  const { onboarded } = useAppState();
  const fade = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ).start();
    const t = setTimeout(() => router.replace(onboarded ? '/home' : '/onboarding'), 2200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Animated.View style={{ alignItems: 'center', opacity: fade }}>
        <Animated.View
          style={{
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.9] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) }],
          }}
        >
          <Logo variant="serif" size={52} dark />
        </Animated.View>
        <Text style={styles.tagline}>gjør ingenting</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgInverse, alignItems: 'center', justifyContent: 'center' },
  tagline: {
    fontFamily: fonts.sansLight,
    fontSize: 12,
    letterSpacing: em(12, 0.1),
    textTransform: 'uppercase',
    color: onDark.fg30,
    marginTop: 12,
  },
});
