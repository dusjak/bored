import { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { NUDGE_BODY, NUDGE_CLOSE, NUDGE_ENABLE, NUDGE_LATER, NUDGE_TITLE } from '@/backup/copy';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme';

type Props = {
  onEnable: () => void;
  /** Called after the card has collapsed, or immediately when Reduce Motion is on. */
  onDismiss: () => void;
};

/** Info card. VoiceOver order is title, body, actions, then «Lukk». */
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
            },
          ]}
        >
          <View style={{ paddingRight: theme.size['hit-min'], gap: theme.space['2'] }}>
            <Text style={[theme.text.label, { color: theme.color.text.primary }]}>{NUDGE_TITLE}</Text>
            <Text style={[theme.text.bodySmall, { color: theme.color.text.primary }]}>{NUDGE_BODY}</Text>
          </View>
          <View style={[styles.actions, { gap: theme.space['2'] }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={NUDGE_ENABLE}
              onPress={onEnable}
              style={styles.action}
            >
              <Text style={[theme.text.labelSmall, { color: theme.color.button['tertiary-text'] }]}>{NUDGE_ENABLE}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={NUDGE_LATER}
              onPress={dismiss}
              style={[styles.action, { paddingHorizontal: theme.space['4'] }]}
            >
              <Text style={[theme.text.labelSmall, { color: theme.color.text.secondary }]}>{NUDGE_LATER}</Text>
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={NUDGE_CLOSE}
            onPress={dismiss}
            hitSlop={0}
            style={[
              styles.close,
              { top: theme.space['2'], right: theme.space['2'], width: theme.size['hit-min'], height: theme.size['hit-min'] },
            ]}
          >
            <Icon name="x" size={20} color={theme.color.text.primary} />
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { position: 'relative' },
  actions: { flexDirection: 'row', alignItems: 'center' },
  action: { minHeight: 44, justifyContent: 'center' },
  close: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
