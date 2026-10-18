import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { colors, em, fonts, onDark, type } from '@/theme';

const RING = 196;
const R = 86;
const CIRC = 2 * Math.PI * R;

/** In-session screen (dark): 3-2-1 intro, then countdown ring with pause / end early. */
export default function Session() {
  const params = useLocalSearchParams<{ minutes?: string }>();
  const minutes = Math.max(1, parseInt(params.minutes ?? '10', 10) || 10);
  const total = minutes * 60;

  const [phase, setPhase] = useState<'intro' | 'running'>('intro');
  const [introCount, setIntroCount] = useState(3);
  const [remaining, setRemaining] = useState(total);
  const [paused, setPaused] = useState(false);
  const endAt = useRef(0);
  const finished = useRef(false);

  const finish = useCallback(
    (elapsedSec: number) => {
      if (finished.current) return;
      finished.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const done = Math.max(1, Math.round(elapsedSec / 60));
      router.replace({ pathname: '/reflection', params: { minutes: String(done) } });
    },
    [],
  );

  // Intro: 3 → 2 → 1 → start
  useEffect(() => {
    if (phase !== 'intro') return;
    const t = setInterval(() => {
      setIntroCount((c) => {
        if (c <= 1) {
          clearInterval(t);
          endAt.current = Date.now() + total * 1000;
          setPhase('running');
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase, total]);

  // Countdown, based on wall clock so it stays correct if JS timers drift.
  // TODO: keep running in background / schedule a local notification on completion.
  useEffect(() => {
    if (phase !== 'running' || paused) return;
    const t = setInterval(() => {
      const left = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        clearInterval(t);
        finish(total);
      }
    }, 250);
    return () => clearInterval(t);
  }, [phase, paused, total, finish]);

  const togglePause = () => {
    if (paused) endAt.current = Date.now() + remaining * 1000;
    setPaused((p) => !p);
    Haptics.selectionAsync();
  };

  // Wordmark dot slowly pulses between sand shades
  const dot = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dot, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(dot, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [dot]);
  const dotColor = dot.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(196,176,154,0.2)', 'rgba(196,176,154,0.9)'],
  });

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const progress = 1 - remaining / total;

  return (
    <Screen dark contentStyle={{ paddingHorizontal: 0 }}>
      {phase === 'intro' ? (
        <View style={styles.intro}>
          {/* TODO: mode guidance (breathing / body / senses) from the pitch could go here */}
          <View style={styles.wordmark}>
            <Text style={styles.wordmarkText}>bored</Text>
            <Animated.Text style={[styles.wordmarkText, { fontFamily: fonts.sans, color: dotColor }]}>.</Animated.Text>
          </View>
          <Text style={[type.mono(72), styles.introCount]}>{introCount}</Text>
          <Pressable hitSlop={12} onPress={() => router.back()}>
            <Text style={styles.cancel}>Avbryt</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.running}>
          <View />
          <View style={{ width: RING, height: RING }}>
            <Svg width={RING} height={RING} style={{ transform: [{ rotate: '-90deg' }] }}>
              <Circle cx={RING / 2} cy={RING / 2} r={R} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
              <Circle
                cx={RING / 2}
                cy={RING / 2}
                r={R}
                fill="none"
                stroke={colors.accent}
                strokeWidth={1}
                strokeDasharray={`${CIRC} ${CIRC}`}
                strokeDashoffset={CIRC * (1 - progress)}
                strokeLinecap="round"
              />
            </Svg>
            <View style={styles.ringCenter}>
              <Text style={[type.mono(46), { color: onDark.fg, lineHeight: 50 }]}>
                {mm}:{ss}
              </Text>
              <Text style={styles.remaining}>{paused ? 'pause' : 'gjenstår'}</Text>
            </View>
          </View>
          <View style={styles.controls}>
            <Pressable
              onPress={togglePause}
              hitSlop={16}
              accessibilityLabel={paused ? 'Fortsett' : 'Pause'}
              style={{ opacity: paused ? 0.8 : 0.4 }}
            >
              <Icon name={paused ? 'play' : 'pause'} size={26} color={onDark.fg} />
            </Pressable>
            <Button title="Avslutt tidlig" variant="darkOutline" onPress={() => finish(total - remaining)} />
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  wordmark: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 56 },
  wordmarkText: { fontFamily: fonts.sansLight, fontSize: 38, letterSpacing: em(38, -0.01), color: onDark.fg85 },
  introCount: { color: onDark.fg12, lineHeight: 76, marginBottom: 48 },
  cancel: { fontFamily: fonts.sansLight, fontSize: 13, color: onDark.fg20, paddingVertical: 8 },
  running: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 32, paddingTop: 32, paddingBottom: 24 },
  ringCenter: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  remaining: {
    fontFamily: fonts.sans,
    fontSize: 10,
    letterSpacing: em(10, 0.1),
    textTransform: 'uppercase',
    color: onDark.fg18,
    marginTop: 8,
  },
  controls: { alignItems: 'center', gap: 20, width: '100%' },
});
