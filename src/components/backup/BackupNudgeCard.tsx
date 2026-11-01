import { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { NUDGE_BODY, NUDGE_CLOSE, NUDGE_ENABLE, NUDGE_LATER, NUDGE_TITLE } from '@/backup/copy';
import { useTheme } from '@/theme';

type Props = {
  onEnable: () => void;
  /** Called after the card has collapsed, or immediately when Reduce Motion is on. */
  onDismiss: () => void;
};

/**
 * Infomelding from «N1 Logg – hint om sikkerhetskopi» (105:2087).
 * The × is a 20×20 mark, top-aligned with the title. hitSlop grows the target to 44×44
 * without moving the mark. VoiceOver follows the frame: title, body, Lukk, then the actions.
 */
export function BackupNudgeCard({ onEnable, onDismiss }: Props) {
  const { theme } = useTheme();
  const reduceMotion = useReducedMotion();
  const measured = useSharedValue(0);
  const progress = useSharedValue(1);
  const closed = useRef(false);

  const animatedStyle = useAnimatedStyle(() => {
    if (measured.value <= 0) return {};
    return {
      height: measured.value * progress.value,
      opacity: progress.value,
      overflow: 'hidden' as const,
    };
  });

  const finish = () => {
    if (closed.current) return;
    closed.current = true;
    onDismiss();
  };

  const dismiss = () => {
    if (reduceMotion) {
      finish();
      return;
    }
    progress.value = withTiming(0, { duration: theme.motion.fast, easing: Easing.out(Easing.cubic) }, (ended) => {
      if (ended) runOnJS(finish)();
    });
  };

  return (
    <Animated.View style={animatedStyle}>
      <View
        onLayout={(event) => {
          const next = event.nativeEvent.layout.height;
          if (measured.value === 0 && next > 0) measured.value = next;
        }}
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.color.surface.default,
              borderRadius: theme.radius.large,
              paddingLeft: theme.space['4'],
              paddingRight: theme.space['2'],
              paddingTop: theme.space['4'],
              paddingBottom: theme.space['2'],
              marginBottom: theme.space['6'],
              gap: theme.space['1'],
            },
          ]}
        >
          <View style={[styles.top, { gap: theme.space['2'] }]}>
            <View style={[styles.copy, { gap: theme.space['2'] }]}>
              <Text style={[theme.text.label, { color: theme.color.text.primary }]}>{NUDGE_TITLE}</Text>
              <Text style={[theme.text.bodySmall, { color: theme.color.text.primary }]}>{NUDGE_BODY}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={NUDGE_CLOSE}
              onPress={dismiss}
              hitSlop={12}
              style={styles.close}
            >
              <CloseMark color={theme.color.text.tertiary} />
            </Pressable>
          </View>
          <View style={[styles.actions, { gap: theme.space['2'] }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={NUDGE_ENABLE}
              onPress={onEnable}
              style={styles.action}
            >
              <Text style={[theme.text.labelSmall, { color: theme.color.button['tertiary-text'] }]}>
                {NUDGE_ENABLE}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={NUDGE_LATER}
              onPress={dismiss}
              style={[styles.action, { paddingHorizontal: theme.space['4'] }]}
            >
              <Text style={[theme.text.labelSmall, { color: theme.color.button['ghost-text'] }]}>{NUDGE_LATER}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

/** 20×20 close mark from the frame. Stroke is `text.tertiary` (#66635D in light). */
function CloseMark({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Path
        d="M15 5L10 10M10 10L5 15M10 10L5 5M10 10L15 15"
        stroke={color}
        strokeWidth={1.25}
        strokeLinecap="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  card: {},
  top: { flexDirection: 'row', alignItems: 'flex-start' },
  copy: { flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center' },
  action: { minHeight: 44, justifyContent: 'center' },
  close: { width: 20, height: 20 },
});
