import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { TactileCircle } from '@/components/TactileCircle';
import { minutesPhrase, parseCustomMinutes, PRESET_MINUTES } from '@/data/copy';
import { useTheme } from '@/theme';

type Props = {
  visible: boolean;
  current: number;
  onUse: (minutes: number) => void;
  onClose: () => void;
};

const ITEM = 44;

/** Duration sheet: 5/10/15/20 wheel, or a custom value from 5 to 20 minutes. */
export function DurationSheet({ visible, current, onUse, onClose }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const initial = (PRESET_MINUTES as readonly number[]).includes(current) ? current : 10;
  const [picked, setPicked] = useState(initial);
  const [customOpen, setCustomOpen] = useState(false);
  const [custom, setCustom] = useState('');
  const scroller = useRef<ScrollView>(null);
  const lastIndex = useRef(PRESET_MINUTES.indexOf(initial as (typeof PRESET_MINUTES)[number]));

  useEffect(() => {
    if (!visible) return;
    const next = (PRESET_MINUTES as readonly number[]).includes(current) ? current : 10;
    setPicked(next);
    setCustomOpen(false);
    setCustom('');
    const index = PRESET_MINUTES.indexOf(next as (typeof PRESET_MINUTES)[number]);
    lastIndex.current = index;
    requestAnimationFrame(() => scroller.current?.scrollTo({ y: index * ITEM, animated: false }));
  }, [visible, current]);

  const snapTo = (offsetY: number) => {
    const index = Math.min(PRESET_MINUTES.length - 1, Math.max(0, Math.round(offsetY / ITEM)));
    if (index !== lastIndex.current) {
      lastIndex.current = index;
      setPicked(PRESET_MINUTES[index]);
      Haptics.selectionAsync();
    } else {
      setPicked(PRESET_MINUTES[index]);
    }
  };

  const step = (direction: 1 | -1) => {
    const index = PRESET_MINUTES.indexOf(picked as (typeof PRESET_MINUTES)[number]);
    const next = Math.min(PRESET_MINUTES.length - 1, Math.max(0, index + direction));
    if (next === index) return;
    lastIndex.current = next;
    setPicked(PRESET_MINUTES[next]);
    scroller.current?.scrollTo({ y: next * ITEM, animated: true });
    Haptics.selectionAsync();
  };

  const customMinutes = parseCustomMinutes(custom);
  const canUse = customOpen ? customMinutes != null : true;

  const confirm = () => {
    if (customOpen) {
      if (customMinutes == null) return;
      onUse(customMinutes);
      return;
    }
    onUse(picked);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.wrap}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Lukk"
          accessibilityRole="button"
        >
          <View style={[styles.backdrop, { backgroundColor: theme.color.bg.overlay }]} />
        </Pressable>
        <View
          accessibilityViewIsModal
          accessibilityActions={[{ name: 'close', label: 'Lukk' }]}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === 'close') onClose();
          }}
          style={[
            styles.sheet,
            {
              backgroundColor: theme.color.surface.sheet,
              paddingBottom: Math.max(insets.bottom, theme.space['6']),
              borderTopLeftRadius: theme.radius.large,
              borderTopRightRadius: theme.radius.large,
            },
          ]}
        >
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Lukk"
            style={styles.handleHit}
          >
            <View style={[styles.handle, { backgroundColor: theme.color.control.off }]} />
          </Pressable>

          <View style={styles.body}>
            <TactileCircle accessibilityLabel={minutesPhrase(customOpen && customMinutes ? customMinutes : picked)}>
              <Text style={[theme.text.monoHero, { color: theme.color.object.content }]}>
                {customOpen && customMinutes ? customMinutes : picked}
              </Text>
            </TactileCircle>

            <View
              style={[styles.wheelWindow, { height: ITEM * 3 }]}
              accessibilityRole="adjustable"
              accessibilityLabel="Varighet"
              accessibilityValue={{ text: `Varighet, ${minutesPhrase(picked)}` }}
              accessibilityActions={[
                { name: 'increment', label: 'Øk' },
                { name: 'decrement', label: 'Senk' },
              ]}
              onAccessibilityAction={(event) => {
                if (event.nativeEvent.actionName === 'increment') step(1);
                if (event.nativeEvent.actionName === 'decrement') step(-1);
              }}
            >
              <ScrollView
                ref={scroller}
                snapToInterval={ITEM}
                decelerationRate="fast"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: ITEM }}
                onLayout={() => scroller.current?.scrollTo({ y: lastIndex.current * ITEM, animated: false })}
                onMomentumScrollEnd={(event) => snapTo(event.nativeEvent.contentOffset.y)}
                onScrollEndDrag={(event) => {
                  const velocity = event.nativeEvent.velocity?.y ?? 0;
                  if (Math.abs(velocity) < 0.05) snapTo(event.nativeEvent.contentOffset.y);
                }}
                style={{ height: ITEM * 3 }}
              >
                {PRESET_MINUTES.map((minutes) => (
                  <View key={minutes} style={styles.wheelItem}>
                    <Text style={[theme.text.monoMeta, { color: theme.color.text.secondary }]}>{minutes}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>

            <View
              accessible
              accessibilityLabel={`Trinn ${PRESET_MINUTES.indexOf(picked as (typeof PRESET_MINUTES)[number]) + 1} av ${PRESET_MINUTES.length}`}
              style={styles.detents}
            >
              {PRESET_MINUTES.map((minutes, index) => {
                const selected = minutes === picked;
                return (
                  <View
                    key={minutes}
                    importantForAccessibility="no"
                    style={{
                      width: selected ? 24 : 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: selected ? theme.color.ink.default : theme.color.control.off,
                      marginLeft: index === 0 ? 0 : 6,
                    }}
                  />
                );
              })}
            </View>

            {customOpen ? (
              <TextInput
                autoFocus
                keyboardType="number-pad"
                placeholder="5–20 minutter"
                placeholderTextColor={theme.color.text.tertiary}
                value={custom}
                onChangeText={(value) => setCustom(value.replace(/[^0-9]/g, '').slice(0, 2))}
                accessibilityLabel="Annen lengde"
                style={[
                  styles.input,
                  theme.text.body,
                  {
                    color: theme.color.text.primary,
                    borderColor: theme.color.border.strong,
                    borderRadius: theme.radius.medium,
                  },
                ]}
              />
            ) : (
              <Button title="Annen lengde" variant="tertiary" size="compact" onPress={() => setCustomOpen(true)} />
            )}

            <Button title="Bruk" size="regular" disabled={!canUse} onPress={confirm} style={{ marginTop: theme.space['3'] }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1 },
  sheet: {},
  handleHit: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  handle: { width: 36, height: 4, borderRadius: 2 },
  body: { alignItems: 'center', paddingHorizontal: 28, gap: 16 },
  wheelWindow: { width: '100%', overflow: 'hidden' },
  wheelItem: { height: ITEM, alignItems: 'center', justifyContent: 'center' },
  detents: { flexDirection: 'row', alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  input: {
    width: '100%',
    minHeight: 44,
    borderWidth: 1,
    paddingHorizontal: 16,
    textAlign: 'center',
  },
});
