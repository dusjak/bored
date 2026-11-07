import { useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Button } from '@/components/Button';
import { LiveKlump } from '@/components/LiveKlump';
import { OnboardingHeader } from '@/components/OnboardingHeader';
import { Screen } from '@/components/Screen';
import { BLI_STEP, confirmedMinutes, defaultMaterial, skipBliKjent } from '@/onboarding/flow';
import { deform, emptyOffsets, materialDrag, velvetTravel } from '@/onboarding/formShape';
import { klumpWidth, minutesToIndex } from '@/duration/klumpen';
import { materialPlacement } from '@/materials/restMaps';
import { useAppState } from '@/state/AppState';
import { useTheme } from '@/theme';

/** Drag the edge. Nothing here advances on its own. The gesture mark in the stills is not UI. */
export default function FormStep() {
  const { theme } = useTheme();
  const { user, updateUser, setDurationMinutes } = useAppState();
  const minutes = confirmedMinutes(user.duration);
  const material = defaultMaterial(user.materialId);
  const spec = materialDrag(material);
  const saved = user.forms?.[material] ?? emptyOffsets();
  const [offsets, setOffsets] = useState(saved);
  const [holding, setHolding] = useState(false);
  const holdingRef = useRef(false);
  const offsetsRef = useRef(saved);
  offsetsRef.current = offsets;
  const [past, setPast] = useState<number[][]>([]);
  const start = useRef(saved);
  const fired = useRef(false);
  const extra = useRef(false);
  const began = useRef(0);
  const lastAt = useRef(0);
  const smoothed = useRef(0);
  const touch = useRef({ x: 0, y: 0 });
  const angle = useRef(0);
  const width = klumpWidth(minutesToIndex(minutes));
  const half = materialPlacement(width, 0, 0).artboardPt / 2;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        start.current = offsetsRef.current;
        fired.current = false;
        extra.current = false;
        began.current = Date.now();
        lastAt.current = began.current;
        smoothed.current = 0;
        const x = event.nativeEvent.locationX - half;
        const y = event.nativeEvent.locationY - half;
        touch.current = { x, y };
        angle.current = Math.atan2(y, x);
        holdingRef.current = true;
        setHolding(true);
      },
      onPanResponderMove: (event, gesture) => {
        const now = Date.now();
        const raw = Math.hypot(gesture.dx, gesture.dy);
        const travel = material === 'floyel' ? velvetTravel(smoothed.current, raw, now - lastAt.current) : raw;
        smoothed.current = travel;
        lastAt.current = now;
        const x = event.nativeEvent.locationX - half;
        const y = event.nativeEvent.locationY - half;
        const radial = Math.hypot(x, y) >= Math.hypot(touch.current.x, touch.current.y) ? 'out' : 'in';
        const next = deform({
          start: start.current,
          material,
          minutes,
          widthPt: width,
          travelPt: travel,
          angle: angle.current,
          radial,
          elapsedMs: now - began.current,
        });
        if (next.changed && material !== 'emalje') {
          const waited = now - began.current;
          if (!fired.current) {
            fired.current = true;
            const style = material === 'skifer' ? Haptics.ImpactFeedbackStyle.Rigid : material === 'kull' ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Soft;
            void Haptics.impactAsync(style);
          } else if (material === 'skifer' && !extra.current && waited >= 950) {
            extra.current = true;
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
          }
        }
        setOffsets(next.offsets);
      },
      onPanResponderRelease: () => {
        if (material === 'emalje' && offsetsRef.current.some((value, index) => value !== start.current[index])) {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        if (offsetsRef.current.some((value, index) => value !== start.current[index])) {
          setPast((stack) => [...stack, start.current]);
        }
        holdingRef.current = false;
        setHolding(false);
      },
      onPanResponderTerminate: () => {
        holdingRef.current = false;
        setHolding(false);
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
      <View style={styles.stone}>
        <View {...pan.panHandlers}>
          <LiveKlump material={material} minutes={minutes} offsets={offsets} holdLighting={holdingRef.current || holding} />
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
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  half: { width: '46%' },
});
