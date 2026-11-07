import { useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Button } from '@/components/Button';
import { OnboardingHeader } from '@/components/OnboardingHeader';
import { Screen } from '@/components/Screen';
import { BLI_STEP, confirmedMinutes, defaultMaterial, engravedNumberSize, skipBliKjent } from '@/onboarding/flow';
import { deform, emptyOffsets, materialDrag, stonePath } from '@/onboarding/formShape';
import { DURATION_UNIT, KLUMP_ASPECT, STONE_COLOR, klumpWidth, minutesToIndex } from '@/duration/klumpen';
import { useAppState } from '@/state/AppState';
import { useTheme } from '@/theme';
import Svg, { Path } from 'react-native-svg';

/** Drag the edge. Nothing here advances on its own. The gesture mark in the stills is not UI. */
export default function FormStep() {
  const { theme } = useTheme();
  const { user, updateUser, setDurationMinutes } = useAppState();
  const minutes = confirmedMinutes(user.duration);
  const material = defaultMaterial(user.materialId);
  const spec = materialDrag(material);
  const saved = user.forms?.[material] ?? emptyOffsets();
  const [offsets, setOffsets] = useState(saved);
  const offsetsRef = useRef(saved);
  offsetsRef.current = offsets;
  const [past, setPast] = useState<number[][]>([]);
  const start = useRef(saved);
  const fired = useRef(false);
  const angle = useRef(0);
  const width = klumpWidth(minutesToIndex(minutes));
  const height = width * KLUMP_ASPECT;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        start.current = offsetsRef.current;
        fired.current = false;
        const x = event.nativeEvent.locationX - width / 2;
        const y = event.nativeEvent.locationY - height / 2;
        angle.current = Math.atan2(y, x);
      },
      onPanResponderMove: (_, gesture) => {
        const travel = Math.hypot(gesture.dx, gesture.dy);
        const next = deform({
          start: start.current,
          material,
          minutes,
          widthPt: width,
          travelPt: travel,
          angle: angle.current,
        });
        if (next.changed && !fired.current) {
          fired.current = true;
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        }
        setOffsets(next.offsets);
      },
      onPanResponderRelease: () => {
        if (fired.current) setPast((stack) => [...stack, start.current]);
      },
    }),
  ).current;

  const skip = () => {
    const next = skipBliKjent('form', minutes);
    updateUser({ duration: String(next.minutes), materialId: material });
    void setDurationMinutes(next.minutes);
    router.push('/onboarding/velkommen');
  };

  const keep = () => {
    updateUser({ materialId: material, forms: { ...user.forms, [material]: offsets } });
    router.push('/onboarding/ov');
  };

  return (
    <Screen top="none" contentStyle={styles.content}>
      <OnboardingHeader
        step={BLI_STEP.form}
        total={5}
        title="Gi den din form."
        sub="Dra i kanten. Det finnes ingen riktig fasong."
      />
      <Text style={[theme.text.caption, styles.meta, { color: theme.color.text.tertiary }]}>
        {spec.name} · {minutes} minutter
      </Text>
      <View style={styles.stone} {...pan.panHandlers}>
        <View style={{ width, height }}>
          <Svg width={width} height={height} viewBox="0 77.233 1000 845.53">
            <Path d={stonePath(offsets)} fill={STONE_COLOR} />
          </Svg>
          <View pointerEvents="none" style={styles.face}>
            <Text style={{ fontFamily: theme.fonts.sans, fontSize: engravedNumberSize(minutes), color: '#F8F6F2', fontVariant: ['tabular-nums'] }}>
              {minutes}
            </Text>
            <Text style={{ fontFamily: theme.fonts.sans, fontSize: 13, color: '#F8F6F2' }}>{DURATION_UNIT}</Text>
          </View>
        </View>
      </View>
      <Text style={[theme.text.caption, styles.meta, { color: theme.color.text.tertiary }]}>
        Tiden i midten har alltid god plass.
      </Text>
      <View style={styles.actions}>
        <Button
          title="Angre"
          variant="ghost"
          style={styles.half}
          onPress={() => {
            const previous = past[past.length - 1];
            if (!previous) return;
            setPast((stack) => stack.slice(0, -1));
            setOffsets(previous);
            void Haptics.selectionAsync();
          }}
        />
        <Button
          title="Nullstill"
          variant="ghost"
          style={styles.half}
          onPress={() => {
            if (offsets.every((value) => value === 0)) return;
            setPast((stack) => [...stack, offsets]);
            setOffsets(emptyOffsets());
            void Haptics.selectionAsync();
          }}
        />
      </View>
      <Button title="Behold formen" onPress={keep} />
      <Button title="Hopp over" variant="ghost" style={{ marginTop: 8 }} onPress={skip} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  meta: { textAlign: 'center', marginBottom: 8 },
  stone: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  face: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  half: { width: '46%' },
});
