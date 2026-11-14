import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { switchBezier, switchDuration, switchInset, switchKnob, switchTrack, switchTravel } from '@/theme/deg';
import { useTheme } from '@/theme';

type Props = {
  value: boolean;
  onChange?: (next: boolean) => void;
  accessibilityLabel?: string;
  /**
   * The parent row is the switch. This view only draws the track.
   * Deg uses that so the whole row is the 44pt target.
   */
  embedded?: boolean;
};

/**
 * BORED switch. 52×31 track, 27pt knob, 2pt inset.
 * Not a native UISwitch. Off track keeps a 1pt border so the control
 * clears 3:1 against the card (the fill alone is about 1.9:1 in the dark).
 */
export function Toggle({ value, onChange, accessibilityLabel, embedded }: Props) {
  const { theme } = useTheme();
  const reduced = useReducedMotion() === true;
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    const next = value ? 1 : 0;
    if (reduced) {
      progress.value = next;
      return;
    }
    progress.value = withTiming(next, {
      duration: switchDuration,
      easing: Easing.bezier(switchBezier[0], switchBezier[1], switchBezier[2], switchBezier[3]),
    });
  }, [progress, reduced, value]);

  const knobStyle = useAnimatedStyle(() => ({
    // The 1pt border sits inside the 52pt track, and the knob is positioned
    // inside that border. Start one point in so the outer inset stays 2pt.
    transform: [{ translateX: switchInset - 1 + progress.value * switchTravel }],
  }));
  const onFillStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  const off = theme.color.control.off;
  const on = theme.color.control.on;
  const offKnob = theme.color.control.offKnob;
  const onKnob = theme.color.control.onKnob;
  const border = theme.color.control.offBorder;
  const lightOff = theme.name === 'light' && !value;

  const track = (
    <View
      style={[
        styles.track,
        {
          backgroundColor: off,
          borderColor: value ? on : border,
        },
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[styles.onFill, { backgroundColor: on, borderRadius: switchTrack.radius }, onFillStyle]}
      />
      <Animated.View
        style={[
          styles.knob,
          knobStyle,
          { backgroundColor: value ? onKnob : offKnob },
          lightOff ? styles.knobShadow : null,
        ]}
      />
    </View>
  );

  if (embedded) {
    return (
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {track}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value }}
      onPress={() => {
        void Haptics.selectionAsync();
        onChange?.(!value);
      }}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
    >
      {track}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: switchTrack.width,
    height: switchTrack.height,
    borderRadius: switchTrack.radius,
    borderWidth: 1,
    justifyContent: 'center',
  },
  onFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  knob: {
    position: 'absolute',
    left: 0,
    width: switchKnob,
    height: switchKnob,
    borderRadius: switchKnob / 2,
  },
  /** Light off knob: 0 1 3, warm 22%. */
  knobShadow: {
    shadowColor: '#3C3228',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 3,
    elevation: 2,
  },
});
