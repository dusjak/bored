import { useEffect, useRef, useState, type RefObject } from 'react';
import {
  AccessibilityInfo,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type HostInstance,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AiCard } from '@/components/AiCard';
import { Button } from '@/components/Button';
import { ContentColumn } from '@/components/ContentColumn';
import { KlumpenBody, KlumpenGlyph, crossfadeTo } from '@/components/Klumpen';
import { ScreenTitle } from '@/components/ScreenTitle';
import { Sheet } from '@/components/Sheet';
import { features } from '@/config/features';
import { PRESET_MINUTES } from '@/data/copy';
import {
  DURATION_ADJUST_HINT,
  DURATION_ADJUST_LABEL,
  DURATION_SUBTITLE,
  DURATION_TITLE,
  FILL_MS,
  KLUMP_ASPECT,
  CHOICE_HIT_MIN,
  ROW_HIT,
  ROW_STROKE,
  ROW_WIDTHS,
  SHEET_SECTION_GAP,
  SIZE_SPRING,
  SWIPE_ACTIVATION,
  SWIPE_STEP,
  VERTICAL_YIELD,
  chosenAnnouncement,
  clampIndex,
  durationType,
  durationValueText,
  indexFromSwipe,
  indexVelocity,
  presetIndex,
  rowPitch,
  selectionFromIndex,
  snapIndex,
  useButtonLabel,
} from '@/duration/klumpen';
import { useTheme } from '@/theme';

type Props = {
  visible: boolean;
  current: number;
  /** Finished sessions. Read only when features.aiCard is on. */
  sessionCount?: number;
  onUse: (minutes: number) => void;
  onClose: () => void;
  /** Focus returns to the control that opened the sheet. */
  returnFocusRef?: RefObject<HostInstance | null>;
};

/**
 * Duration sheet, direction C. The Klumpen grows with the length.
 * Open, close, the dim, and focus return come from `Sheet`.
 * `scrollable` stays off: the big Klumpen has its own pan, and a sheet
 * scroll view would compete with it. Large type still scrolls the choice
 * stack inside the body.
 * The number is `text.monoHero` (Figtree Light, tabular-nums).
 */
export function DurationSheet({ visible, current, sessionCount, onUse, onClose, returnFocusRef }: Props) {
  return (
    <Sheet visible={visible} onClose={onClose} returnFocusRef={returnFocusRef}>
      <DurationBody
        visible={visible}
        current={current}
        sessionCount={sessionCount}
        onUse={onUse}
        onClose={onClose}
      />
    </Sheet>
  );
}

function DurationBody({
  visible,
  current,
  sessionCount,
  onUse,
  onClose,
}: {
  visible: boolean;
  current: number;
  sessionCount?: number;
  onUse: (minutes: number) => void;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { fontScale, width: screenWidth, height: windowHeight } = useWindowDimensions();
  const reduceMotion = useReducedMotion() === true;
  const type = durationType(fontScale);
  const scroll = type.verticalChoices || fontScale > 1.2 || windowHeight < 740;
  const scrollMax = Math.max(180, windowHeight - insets.top - 160);
  const initial = presetIndex(current);
  const [selected, setSelected] = useState(initial);
  const selectedRef = useRef(initial);
  const indexSv = useSharedValue(initial);
  const reduceSv = useSharedValue(reduceMotion ? 1 : 0);
  const fadeFrom = useSharedValue(initial);
  const fadeTo = useSharedValue(initial);
  const fadeU = useSharedValue(1);
  const fade = useRef({ from: fadeFrom, to: fadeTo, u: fadeU }).current;
  const reduceRef = useRef(reduceMotion);
  reduceRef.current = reduceMotion;
  const minutes = PRESET_MINUTES[selected] ?? PRESET_MINUTES[1];
  const opened = useRef(false);

  useEffect(() => {
    reduceSv.value = reduceMotion ? 1 : 0;
  }, [reduceMotion, reduceSv]);

  useEffect(() => {
    if (!visible) {
      opened.current = false;
      return;
    }
    if (opened.current) return;
    opened.current = true;
    const next = presetIndex(current);
    selectedRef.current = next;
    setSelected(next);
    indexSv.value = next;
    fade.from.value = next;
    fade.to.value = next;
    fade.u.value = 1;
  }, [current, fade, indexSv, visible]);

  const apply = (next: number, velocityX: number) => {
    const changed = next !== selectedRef.current;
    selectedRef.current = next;
    setSelected(next);
    if (changed) void Haptics.selectionAsync();
    if (reduceRef.current) {
      if (changed) crossfadeTo(fade, next);
      return;
    }
    indexSv.value = withSpring(next, {
      mass: SIZE_SPRING.mass,
      stiffness: SIZE_SPRING.stiffness,
      damping: SIZE_SPRING.damping,
      velocity: indexVelocity(velocityX),
    });
  };

  const preview = (next: number) => {
    if (next === selectedRef.current) return;
    selectedRef.current = next;
    setSelected(next);
    void Haptics.selectionAsync();
    if (reduceRef.current) crossfadeTo(fade, next);
  };

  const api = useRef({
    preview,
    release: (next: number, velocityX: number) => apply(next, velocityX),
    dismiss: onClose,
  });
  api.current.preview = preview;
  api.current.release = (next, velocityX) => apply(next, velocityX);
  api.current.dismiss = onClose;

  const axis = useRef<'x' | 'y' | null>(null);
  const startIndex = useRef(initial);
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => {
        const vertical = gesture.dy > VERTICAL_YIELD && gesture.dy > Math.abs(gesture.dx);
        const horizontal = Math.abs(gesture.dx) > SWIPE_ACTIVATION && Math.abs(gesture.dx) > Math.abs(gesture.dy);
        return vertical || horizontal;
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        axis.current = null;
        startIndex.current = selectedRef.current;
        cancelAnimation(indexSv);
        cancelAnimation(fade.u);
      },
      onPanResponderMove: (_, gesture) => {
        if (axis.current == null) {
          if (gesture.dy > VERTICAL_YIELD && gesture.dy > Math.abs(gesture.dx)) axis.current = 'y';
          else if (Math.abs(gesture.dx) > SWIPE_ACTIVATION) axis.current = 'x';
          else return;
        }
        if (axis.current !== 'x') return;
        if (reduceRef.current) {
          api.current.preview(selectionFromIndex(startIndex.current + gesture.dx / SWIPE_STEP));
          return;
        }
        const next = indexFromSwipe(startIndex.current, gesture.dx);
        indexSv.value = next;
        api.current.preview(selectionFromIndex(next));
      },
      onPanResponderRelease: (_, gesture) => {
        if (axis.current === 'y') {
          if (gesture.dy > 32) api.current.dismiss();
          return;
        }
        if (axis.current !== 'x') return;
        const next = indexFromSwipe(startIndex.current, gesture.dx);
        api.current.release(snapIndex(next, gesture.vx), gesture.vx);
      },
      onPanResponderTerminate: (_, gesture) => {
        if (axis.current !== 'x') return;
        const next = indexFromSwipe(startIndex.current, gesture.dx);
        api.current.release(snapIndex(next, 0), 0);
      },
    }),
  ).current;

  const step = (direction: 1 | -1) => {
    apply(clampIndex(selectedRef.current + direction), 0);
  };

  const confirm = () => {
    const picked = PRESET_MINUTES[selectedRef.current] ?? PRESET_MINUTES[1];
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    AccessibilityInfo.announceForAccessibility(chosenAnnouncement(picked));
    onUse(picked);
  };

  const middle = (
    <>
      <View style={styles.titleBlock}>
        <ScreenTitle>{DURATION_TITLE}</ScreenTitle>
        <Text style={[theme.text.body, styles.subtitle, { color: theme.color.text.secondary }]}>{DURATION_SUBTITLE}</Text>
      </View>

      <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.stone} {...pan.panHandlers}>
        <KlumpenBody
          index={indexSv}
          minutes={minutes}
          reduce={reduceSv}
          reduceMotion={reduceMotion}
          fade={fade}
          ghost
        />
      </View>

      <Choices
        selected={selected}
        valueText={durationValueText(minutes)}
        vertical={type.verticalChoices}
        pitch={rowPitch(screenWidth)}
        onStep={step}
        onPick={(index) => {
          if (index === selectedRef.current) return;
          apply(index, 0);
        }}
      />

      {features.aiCard ? <AiCard sessionCount={sessionCount ?? 0} onUse={onUse} /> : null}
    </>
  );

  return (
    <View>
      {scroll ? (
        <ScrollView
          bounces={false}
          keyboardShouldPersistTaps="handled"
          style={{ maxHeight: scrollMax }}
        >
          <ContentColumn>{middle}</ContentColumn>
        </ScrollView>
      ) : (
        <ContentColumn>{middle}</ContentColumn>
      )}
      <ContentColumn style={styles.footer}>
        <Button
          title="Bruk"
          accessibilityLabel={useButtonLabel(minutes)}
          size="comfort"
          onPress={confirm}
          style={{ alignSelf: 'stretch' }}
        />
      </ContentColumn>
    </View>
  );
}

function Choices({
  selected,
  valueText,
  vertical,
  pitch,
  onStep,
  onPick,
}: {
  selected: number;
  valueText: string;
  vertical: boolean;
  pitch: number;
  onStep: (direction: 1 | -1) => void;
  onPick: (index: number) => void;
}) {
  const { theme } = useTheme();
  const ink = theme.color.ink.default;
  const stroke = theme.color.text.tertiary;
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={DURATION_ADJUST_LABEL}
      accessibilityHint={DURATION_ADJUST_HINT}
      accessibilityValue={{ text: valueText }}
      accessibilityActions={[
        { name: 'increment', label: 'Øk' },
        { name: 'decrement', label: 'Senk' },
      ]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'increment') onStep(1);
        if (event.nativeEvent.actionName === 'decrement') onStep(-1);
      }}
      style={vertical ? styles.list : styles.row}
    >
      {PRESET_MINUTES.map((minutes, index) => {
        const on = selected === index;
        const pip = <Pip width={ROW_WIDTHS[index] ?? 22} selected={on} ink={ink} stroke={stroke} />;
        return (
          <Pressable
            key={minutes}
            accessibilityRole="button"
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            onPress={() => onPick(index)}
            style={vertical ? styles.vRow : [styles.choice, { width: pitch }]}
          >
            {vertical ? null : <View style={styles.hit}>{pip}</View>}
            {vertical ? pip : null}
            <ChoiceLabel label={String(minutes)} selected={on} beside={vertical} />
          </Pressable>
        );
      })}
    </View>
  );
}

function Pip({ width, selected, ink, stroke }: { width: number; selected: boolean; ink: string; stroke: string }) {
  const fill = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    fill.value = withTiming(selected ? 1 : 0, { duration: FILL_MS, easing: Easing.inOut(Easing.sin) });
  }, [fill, selected]);
  const on = useAnimatedStyle(() => ({ opacity: fill.value }));
  const off = useAnimatedStyle(() => ({ opacity: 1 - fill.value }));
  return (
    <View style={{ width, height: width * KLUMP_ASPECT }}>
      <Animated.View style={[StyleSheet.absoluteFill, off]}>
        <KlumpenGlyph width={width} stroke={stroke} strokeWidth={ROW_STROKE} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, on]}>
        <KlumpenGlyph width={width} fill={ink} />
      </Animated.View>
    </View>
  );
}

function ChoiceLabel({ label, selected, beside = false }: { label: string; selected: boolean; beside?: boolean }) {
  const { theme } = useTheme();
  const weight = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    weight.value = withTiming(selected ? 1 : 0, { duration: FILL_MS, easing: Easing.inOut(Easing.sin) });
  }, [selected, weight]);
  const on = useAnimatedStyle(() => ({ opacity: weight.value }));
  const off = useAnimatedStyle(() => ({ opacity: 1 - weight.value }));
  const face = {
    fontSize: 17,
    lineHeight: 22,
    textAlign: beside ? ('left' as const) : ('center' as const),
    fontVariant: ['tabular-nums' as const],
  };
  return (
    <View style={[styles.labelSlot, beside && styles.labelBeside]}>
      <Animated.Text style={[face, { fontFamily: theme.fonts.sansMedium, color: theme.color.text.tertiary }, off]}>
        {label}
      </Animated.Text>
      <Animated.Text
        style={[face, styles.labelOn, { fontFamily: theme.fonts.sansSemiBold, color: theme.color.ink.default }, on]}
      >
        {label}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  titleBlock: { marginTop: 28 },
  subtitle: { marginTop: 2 },
  stone: { marginTop: 52, alignItems: 'center' },
  row: { marginTop: SHEET_SECTION_GAP, flexDirection: 'row', alignSelf: 'center' },
  list: { marginTop: SHEET_SECTION_GAP, alignSelf: 'stretch' },
  choice: { minWidth: CHOICE_HIT_MIN, minHeight: CHOICE_HIT_MIN, alignItems: 'center' },
  hit: { width: ROW_HIT, height: ROW_HIT, alignItems: 'center', justifyContent: 'flex-end' },
  vRow: {
    minWidth: CHOICE_HIT_MIN,
    minHeight: Math.max(CHOICE_HIT_MIN, 48),
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  footer: { marginTop: SHEET_SECTION_GAP },
  labelSlot: { marginTop: 8, height: 22, alignSelf: 'stretch', alignItems: 'center' },
  labelBeside: { marginTop: 0, flex: 1, alignItems: 'flex-start' },
  labelOn: { position: 'absolute', left: 0, right: 0 },
});
