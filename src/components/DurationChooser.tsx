import { useEffect, useRef, useState, type ReactNode } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import { PRESET_MINUTES } from '@/data/copy';
import {
  DURATION_ADJUST_HINT,
  DURATION_ADJUST_LABEL,
  FILL_MS,
  ROW_HIT,
  ROW_STROKE,
  ROW_WIDTHS,
  SHEET_NUMBER_UNIT_GAP,
  SIZE_SPRING,
  STONE_NUMBER_COLOR,
  clampIndex,
  durationValueText,
  glyphFrame,
  indexFromSwipe,
  indexVelocity,
  klumpHeight,
  klumpWidth,
  minutesToIndex,
  rowPitch,
  selectionFromIndex,
  stonePanAxis,
  stoneReleaseAction,
  verticalStoneIndex,
} from '@/duration/klumpen';
import { useTheme } from '@/theme';
import { Button } from './Button';
import { KlumpenBody, KlumpenGlyph, crossfadeTo } from './Klumpen';
import { StoneAnchor } from './StoneAnchor';

type Props = {
  minutes: number;
  onConfirm: (minutes: number) => void;
  confirmTitle?: string;
  /** The 5/10/15/20 row. The guess screen hides it and swipes the lump only. */
  showChoices?: boolean;
  hint?: string;
  stone?: (minutes: number) => ReactNode;
};

/**
 * The existing duration stone, full screen.
 * Fortsett confirms the minutes the pan or the row selected. A choice does not advance.
 * The number-to-«min» gap stays the sheet gap. Hjem keeps its own 4pt gap.
 */
export function DurationChooser({
  minutes,
  onConfirm,
  confirmTitle = 'Fortsett',
  showChoices = true,
  hint,
  stone,
}: Props) {
  const { theme } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const reduceMotion = useReducedMotion() === true;
  const initial = minutesToIndex(minutes);
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
  const shown = PRESET_MINUTES[selected] ?? PRESET_MINUTES[1];

  useEffect(() => {
    reduceSv.value = reduceMotion ? 1 : 0;
  }, [reduceMotion, reduceSv]);

  const apply = (next: number, velocityX: number) => {
    const index = clampIndex(next);
    const changed = index !== selectedRef.current;
    selectedRef.current = index;
    setSelected(index);
    if (changed) void Haptics.selectionAsync();
    if (reduceRef.current) {
      if (changed) crossfadeTo(fade, index);
      return;
    }
    indexSv.value = withSpring(index, {
      mass: SIZE_SPRING.mass,
      stiffness: SIZE_SPRING.stiffness,
      damping: SIZE_SPRING.damping,
      velocity: indexVelocity(velocityX),
    });
  };

  const preview = (next: number) => {
    const index = clampIndex(selectionFromIndex(next));
    if (index === selectedRef.current) return;
    selectedRef.current = index;
    setSelected(index);
    void Haptics.selectionAsync();
    if (reduceRef.current) crossfadeTo(fade, index);
  };

  const api = useRef({ preview, apply });
  api.current = { preview, apply };
  const axis = useRef<'x' | 'y' | null>(null);
  const startIndex = useRef(initial);
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => stonePanAxis(gesture.dx, gesture.dy, null) != null,
      onPanResponderGrant: () => {
        axis.current = null;
        startIndex.current = selectedRef.current;
      },
      onPanResponderMove: (_, gesture) => {
        axis.current = stonePanAxis(gesture.dx, gesture.dy, axis.current);
        if (axis.current == null) return;
        const next = axis.current === 'y' ? verticalStoneIndex(startIndex.current, gesture.dy) : indexFromSwipe(startIndex.current, gesture.dx);
        if (reduceRef.current) api.current.preview(next);
        else {
          indexSv.value = next;
          api.current.preview(next);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        const action = stoneReleaseAction({
          axis: axis.current,
          startIndex: startIndex.current,
          dx: gesture.dx,
          dy: gesture.dy,
          vx: gesture.vx,
        });
        if (action.kind === 'select') api.current.apply(action.index, axis.current === 'x' ? gesture.vx : 0);
      },
    }),
  ).current;

  const step = (direction: 1 | -1) => apply(selectedRef.current + direction, 0);

  return (
    <View style={styles.fill}>
      <StoneAnchor height={klumpHeight(klumpWidth(3))} style={styles.stone}>
        <View style={styles.lump} {...pan.panHandlers}>
          {stone ? (
            stone(shown)
          ) : (
            <KlumpenBody
              index={indexSv}
              minutes={shown}
              reduce={reduceSv}
              reduceMotion={reduceMotion}
              fade={fade}
              ghost
              rasterOnly
              unitGap={SHEET_NUMBER_UNIT_GAP}
              numberFamily={theme.fonts.sans}
              unitColor={STONE_NUMBER_COLOR}
            />
          )}
          {hint ? (
            <Text style={[theme.text.caption, styles.hint, { color: theme.color.text.tertiary }]}>{hint}</Text>
          ) : null}
        </View>
      </StoneAnchor>
      {showChoices ? (
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={DURATION_ADJUST_LABEL}
          accessibilityHint={DURATION_ADJUST_HINT}
          accessibilityValue={{ text: durationValueText(shown) }}
          accessibilityActions={[
            { name: 'increment', label: 'Øk' },
            { name: 'decrement', label: 'Senk' },
          ]}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === 'increment') step(1);
            if (event.nativeEvent.actionName === 'decrement') step(-1);
          }}
          style={styles.row}
        >
          {PRESET_MINUTES.map((value, index) => {
            const on = selected === index;
            const width = ROW_WIDTHS[index] ?? 22;
            const frame = glyphFrame(width, ROW_STROKE);
            return (
              <Pressable
                key={value}
                accessible={false}
                onPress={() => {
                  if (index !== selectedRef.current) apply(index, 0);
                }}
                style={[styles.choice, { width: rowPitch(screenWidth) }]}
              >
                <View style={{ width: frame.width, height: frame.height }}>
                  <KlumpenGlyph
                    width={width}
                    fill={on ? theme.color.ink.default : 'none'}
                    stroke={on ? 'none' : theme.color.text.tertiary}
                    strokeWidth={on ? 0 : ROW_STROKE}
                    bleed={ROW_STROKE}
                  />
                </View>
                <Text
                  style={{
                    marginTop: 6,
                    fontFamily: on ? theme.fonts.sansSemiBold : theme.fonts.sansMedium,
                    fontSize: 17,
                    lineHeight: 22,
                    color: on ? theme.color.ink.default : theme.color.text.tertiary,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {value}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <Button
        title={confirmTitle}
        onPress={() => onConfirm(PRESET_MINUTES[selectedRef.current] ?? PRESET_MINUTES[1])}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  stone: { minHeight: ROW_HIT },
  lump: { alignItems: 'center', overflow: 'visible' },
  hint: { position: 'absolute', top: '100%', marginTop: 18, textAlign: 'center', width: 280 },
  row: { flexDirection: 'row', alignSelf: 'center', marginBottom: 8 },
  choice: { alignItems: 'center', minHeight: ROW_HIT },
});
