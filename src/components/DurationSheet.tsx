import { useEffect, useRef, useState } from 'react';
import { Modal, PanResponder, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AiCard } from '@/components/AiCard';
import { Button } from '@/components/Button';
import { TactileCircle } from '@/components/TactileCircle';
import { features } from '@/config/features';
import { minutesPhrase, parseCustomMinutes, PRESET_MINUTES } from '@/data/copy';
import { screenPadding, useTheme } from '@/theme';

type Props = {
  visible: boolean;
  current: number;
  /** Finished sessions. Read only when features.aiCard is on. */
  sessionCount?: number;
  onUse: (minutes: number) => void;
  onClose: () => void;
};

const SIZE = 280;
const CENTER = SIZE / 2;
const KNOB_RADIUS = 88;
const LABEL_RADIUS = 118;

function stopAngle(index: number): number {
  return -Math.PI / 2 + index * (Math.PI / 2);
}

function pointOn(radius: number, index: number): { left: number; top: number } {
  const angle = stopAngle(index);
  return {
    left: CENTER + Math.cos(angle) * radius,
    top: CENTER + Math.sin(angle) * radius,
  };
}

function nearestStop(x: number, y: number): number {
  const angle = Math.atan2(y - CENTER, x - CENTER);
  let best = 0;
  let bestDistance = Infinity;
  PRESET_MINUTES.forEach((_, index) => {
    let distance = Math.abs(angle - stopAngle(index));
    if (distance > Math.PI) distance = Math.PI * 2 - distance;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  });
  return best;
}

/** Duration modal: a circle dial for 5/10/15/20, or a custom value from 5 to 20 minutes. */
export function DurationSheet({ visible, current, sessionCount, onUse, onClose }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const presetIndex = (value: number) => {
    const index = (PRESET_MINUTES as readonly number[]).indexOf(value);
    return index >= 0 ? index : 1;
  };
  const [picked, setPicked] = useState(presetIndex(current));
  const [customOpen, setCustomOpen] = useState(false);
  const [custom, setCustom] = useState('');
  const pickedRef = useRef(picked);
  const customOpenRef = useRef(false);
  pickedRef.current = picked;

  const chooseRef = useRef<(index: number) => void>(() => undefined);
  chooseRef.current = (index: number) => {
    if (index === pickedRef.current && !customOpenRef.current) return;
    pickedRef.current = index;
    customOpenRef.current = false;
    setPicked(index);
    setCustomOpen(false);
    setCustom('');
    Haptics.selectionAsync();
  };
  const choose = (index: number) => chooseRef.current(index);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        chooseRef.current(nearestStop(event.nativeEvent.locationX, event.nativeEvent.locationY));
      },
      onPanResponderMove: (event) => {
        chooseRef.current(nearestStop(event.nativeEvent.locationX, event.nativeEvent.locationY));
      },
    }),
  ).current;

  useEffect(() => {
    if (!visible) return;
    const index = presetIndex(current);
    pickedRef.current = index;
    customOpenRef.current = false;
    setPicked(index);
    setCustomOpen(false);
    setCustom('');
  }, [visible, current]);

  const step = (direction: 1 | -1) => {
    choose(Math.min(PRESET_MINUTES.length - 1, Math.max(0, pickedRef.current + direction)));
  };

  const customMinutes = parseCustomMinutes(custom);
  const shown = customOpen ? (customMinutes ?? pickedMinutes(picked)) : PRESET_MINUTES[picked];
  const canUse = customOpen ? customMinutes != null : true;
  const knob = pointOn(KNOB_RADIUS, picked);

  const confirm = () => {
    if (customOpen) {
      if (customMinutes == null) return;
      onUse(customMinutes);
      return;
    }
    onUse(PRESET_MINUTES[picked]);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.wrap}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Lukk" accessibilityRole="button">
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
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Lukk" style={styles.handleHit}>
            <View style={[styles.handle, { backgroundColor: theme.color.control.off }]} />
          </Pressable>

          <View style={styles.body}>
            <Text accessibilityRole="header" style={[theme.text.headline, { color: theme.color.text.primary }]}>
              Velg varighet
            </Text>

            <View
              style={styles.dial}
              accessibilityRole="adjustable"
              accessibilityLabel={`Trinn ${picked + 1} av ${PRESET_MINUTES.length}`}
              accessibilityValue={{ text: `Varighet, ${minutesPhrase(shown)}` }}
              accessibilityActions={[
                { name: 'increment', label: 'Øk' },
                { name: 'decrement', label: 'Senk' },
              ]}
              onAccessibilityAction={(event) => {
                if (event.nativeEvent.actionName === 'increment') step(1);
                if (event.nativeEvent.actionName === 'decrement') step(-1);
              }}
              {...pan.panHandlers}
            >
              <View pointerEvents="none" style={styles.circleSlot}>
                <TactileCircle>
                  <Text style={[theme.text.monoHero, { color: theme.color.object.content }]}>{shown}</Text>
                  <Text style={[theme.text.caption, { color: theme.color.object.content }]}>minutter</Text>
                </TactileCircle>
              </View>
              {!customOpen ? (
                <View
                  pointerEvents="none"
                  style={[
                    styles.knob,
                    {
                      left: knob.left - 11,
                      top: knob.top - 11,
                      backgroundColor: theme.color.ink.default,
                    },
                  ]}
                />
              ) : null}
              {PRESET_MINUTES.map((minutes, index) => {
                const at = pointOn(LABEL_RADIUS, index);
                return (
                  <Pressable
                    key={minutes}
                    accessible={false}
                    importantForAccessibility="no"
                    accessibilityElementsHidden
                    onPress={() => choose(index)}
                    style={[styles.labelHit, { left: at.left - 22, top: at.top - 22 }]}
                  >
                    <Text style={[theme.text.monoMeta, { color: theme.color.text.secondary }]}>{minutes}</Text>
                  </Pressable>
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
                accessibilityLabel="Velg en annen lengde"
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
              <Button
                title="Velg en annen lengde"
                variant="tertiary"
                size="regular"
                onPress={() => {
                  customOpenRef.current = true;
                  setCustomOpen(true);
                }}
              />
            )}

            {features.aiCard ? <AiCard sessionCount={sessionCount ?? 0} onUse={onUse} /> : null}

            <Button title="Bruk" size="comfort" disabled={!canUse} onPress={confirm} style={{ alignSelf: 'stretch' }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function pickedMinutes(index: number): number {
  return PRESET_MINUTES[index] ?? 10;
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1 },
  sheet: {},
  handleHit: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  handle: { width: 36, height: 4, borderRadius: 2 },
  body: { alignItems: 'center', paddingHorizontal: screenPadding, gap: 16 },
  dial: { width: SIZE, height: SIZE },
  circleSlot: { position: 'absolute', left: CENTER - 88, top: CENTER - 88 },
  knob: { position: 'absolute', width: 22, height: 22, borderRadius: 11 },
  labelHit: { position: 'absolute', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  input: {
    alignSelf: 'stretch',
    minHeight: 44,
    borderWidth: 1,
    paddingHorizontal: 16,
    textAlign: 'center',
  },
});
