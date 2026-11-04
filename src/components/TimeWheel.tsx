import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewInstance, type TextStyle } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import {
  deg,
  indexFromOffset,
  WHEEL_HOURS,
  WHEEL_MINUTES,
  wheelIndex,
} from '@/theme/deg';
import { useTheme } from '@/theme';

type Props = {
  open: boolean;
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
};

const PAD = (deg.wheelHeight - deg.wheelRow) / 2;

/**
 * Inline hour and minute wheel. 5-minute steps. The value is committed
 * when the wheel settles. No extra haptic: a custom wheel has no system tick.
 * Reduce Motion skips the height animation and crossfades the wheel.
 */
export function TimeWheel({ open, hour, minute, onChange }: Props) {
  const { theme } = useTheme();
  const reduced = useReducedMotion() === true;
  const height = useSharedValue(open ? deg.wheelHeight : 0);
  const opacity = useSharedValue(open ? 1 : 0);
  const clock = useRef({ hour, minute });
  clock.current = { hour, minute };

  useEffect(() => {
    if (reduced) {
      if (open) {
        height.value = deg.wheelHeight;
        opacity.value = withTiming(1, { duration: 200 });
      } else {
        opacity.value = withTiming(0, { duration: 200 }, (finished) => {
          if (finished) height.value = 0;
        });
      }
      return;
    }
    opacity.value = 1;
    height.value = withTiming(open ? deg.wheelHeight : 0, {
      duration: deg.wheelDuration,
      easing: Easing.bezier(deg.wheelBezier[0], deg.wheelBezier[1], deg.wheelBezier[2], deg.wheelBezier[3]),
    });
  }, [height, opacity, open, reduced]);

  const frame = useAnimatedStyle(() => ({
    height: height.value,
    opacity: opacity.value,
  }));

  const figure: TextStyle = {
    ...theme.text.body,
    fontSize: deg.rowSize,
    lineHeight: deg.wheelRow,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    color: theme.color.text.primary,
  };

  const commit = (nextHour: number, nextMinute: number) => {
    clock.current = { hour: nextHour, minute: nextMinute };
    onChange(nextHour, nextMinute);
  };

  return (
    <Animated.View
      pointerEvents={open ? 'auto' : 'none'}
      accessibilityElementsHidden={!open}
      importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
      style={[styles.clip, frame]}
    >
      <View style={styles.wheel} onStartShouldSetResponder={() => true}>
        <View
          pointerEvents="none"
          style={[styles.band, { backgroundColor: theme.color.control.band, borderRadius: theme.radius.medium }]}
        />
        <Column
          label="Time"
          values={WHEEL_HOURS}
          selected={String(hour).padStart(2, '0')}
          figure={figure}
          open={open}
          onSelect={(next) => commit(Number(next), clock.current.minute)}
        />
        <Animated.Text accessible={false} style={[figure, styles.colon]}>
          :
        </Animated.Text>
        <Column
          label="Minutt"
          values={WHEEL_MINUTES}
          selected={String(minute).padStart(2, '0')}
          figure={figure}
          open={open}
          onSelect={(next) => commit(clock.current.hour, Number(next))}
        />
      </View>
    </Animated.View>
  );
}

function Column({
  label,
  values,
  selected,
  figure,
  open,
  onSelect,
}: {
  label: string;
  values: readonly string[];
  selected: string;
  figure: TextStyle;
  open: boolean;
  onSelect: (value: string) => void;
}) {
  const ref = useRef<ScrollViewInstance>(null);
  const index = wheelIndex(values, selected);
  const scrollY = useSharedValue(index * deg.wheelRow);

  useEffect(() => {
    if (!open) return;
    scrollY.value = index * deg.wheelRow;
    const frame = requestAnimationFrame(() => {
      ref.current?.scrollTo({ y: index * deg.wheelRow, animated: false });
    });
    return () => cancelAnimationFrame(frame);
  }, [index, open, scrollY]);

  const settle = (offset: number) => {
    const next = values[indexFromOffset(offset, values.length)];
    if (next && next !== selected) onSelect(next);
  };

  return (
    <ScrollView
      ref={ref}
      style={styles.column}
      contentContainerStyle={{ paddingVertical: PAD }}
      showsVerticalScrollIndicator={false}
      snapToInterval={deg.wheelRow}
      decelerationRate="fast"
      disableIntervalMomentum
      nestedScrollEnabled
      scrollEventThrottle={16}
      onLayout={() => {
        ref.current?.scrollTo({ y: index * deg.wheelRow, animated: false });
      }}
      onScroll={(event) => {
        scrollY.value = event.nativeEvent.contentOffset.y;
      }}
      onScrollEndDrag={(event) => settle(event.nativeEvent.contentOffset.y)}
      onMomentumScrollEnd={(event) => settle(event.nativeEvent.contentOffset.y)}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: selected }}
      accessibilityActions={[
        { name: 'increment', label: 'Øk' },
        { name: 'decrement', label: 'Senk' },
      ]}
      onAccessibilityAction={(event) => {
        const step = event.nativeEvent.actionName === 'increment' ? 1 : -1;
        const next = (index + step + values.length) % values.length;
        const value = values[next];
        if (value) onSelect(value);
      }}
    >
      {values.map((value, itemIndex) => (
        <WheelItem key={value} index={itemIndex} label={value} scrollY={scrollY} figure={figure} />
      ))}
    </ScrollView>
  );
}

function WheelItem({
  index,
  label,
  scrollY,
  figure,
}: {
  index: number;
  label: string;
  scrollY: SharedValue<number>;
  figure: TextStyle;
}) {
  const fade = useAnimatedStyle(() => {
    const distance = Math.abs(scrollY.value / deg.wheelRow - index);
    return {
      opacity: interpolate(distance, [0, 1, 2, 3], [1, 0.45, 0.22, 0.1], Extrapolation.CLAMP),
    };
  });
  return (
    <Animated.Text accessible={false} style={[figure, styles.item, fade]}>
      {label}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  wheel: {
    height: deg.wheelHeight,
    flexDirection: 'row',
    alignItems: 'center',
  },
  band: {
    position: 'absolute',
    left: deg.wheelInset,
    right: deg.wheelInset,
    top: PAD,
    height: deg.wheelRow,
  },
  column: { flex: 1, height: deg.wheelHeight },
  item: { height: deg.wheelRow },
  colon: { width: 16 },
});
