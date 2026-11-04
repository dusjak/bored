import { useLayoutEffect, useRef, useState } from 'react';
import { Modal, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ContentColumn } from '@/components/ContentColumn';
import { Icon } from '@/components/Icon';
import { ScreenTitle } from '@/components/ScreenTitle';
import { APPEARANCE_CONFIRM, APPEARANCE_OPTIONS, APPEARANCE_SYSTEM_CAPTION, type AppearanceId } from '@/data/copy';
import { ThemeOverride, useTheme, type Theme, type ThemePreference } from '@/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Persistence failed. The sheet still closes; the screen shows the error. */
  onError?: () => void;
};

/**
 * Appearance sheet. A tap previews on the whole app, including this sheet.
 * Dragging down, tapping outside, or back drops the preview.
 * «Velg» is the only path that writes the preference.
 */
export function AppearanceSheet({ visible, onClose, onError }: Props) {
  const live = useTheme();
  const { preference, previewPreference, revertPreview, setPreference } = live;
  const frozen = useRef(live.theme);
  const paint = visible ? live.theme : frozen.current;
  if (visible) frozen.current = live.theme;

  const insets = useSafeAreaInsets();
  const [picked, setPicked] = useState<ThemePreference>(preference);
  const wasVisible = useRef(false);

  useLayoutEffect(() => {
    if (!visible) {
      wasVisible.current = false;
      revertPreview();
      return;
    }
    if (!wasVisible.current) {
      wasVisible.current = true;
      setPicked(preference);
    }
  }, [visible, preference, revertPreview]);

  const dismiss = () => {
    revertPreview();
    onClose();
  };

  const dismissRef = useRef(dismiss);
  dismissRef.current = dismiss;
  const drag = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) => gesture.dy > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderRelease: (_event, gesture) => {
        if (gesture.dy > 32) dismissRef.current();
      },
    }),
  ).current;

  const confirm = () => {
    setPreference(picked).catch(() => onError?.());
    onClose();
  };

  const choose = (id: ThemePreference) => {
    setPicked(id);
    previewPreference(id);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss}>
      <ThemeOverride theme={paint}>
        <SheetBody
          paint={paint}
          insetsBottom={insets.bottom}
          picked={picked}
          dragHandlers={drag.panHandlers}
          onDismiss={dismiss}
          onChoose={choose}
          onConfirm={confirm}
        />
      </ThemeOverride>
    </Modal>
  );
}

function SheetBody({
  paint,
  insetsBottom,
  picked,
  dragHandlers,
  onDismiss,
  onChoose,
  onConfirm,
}: {
  paint: Theme;
  insetsBottom: number;
  picked: ThemePreference;
  dragHandlers: ReturnType<typeof PanResponder.create>['panHandlers'];
  onDismiss: () => void;
  onChoose: (id: ThemePreference) => void;
  onConfirm: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} accessibilityLabel="Lukk" accessibilityRole="button">
        <View style={[styles.backdrop, { backgroundColor: paint.color.bg.overlay }]} />
      </Pressable>
      <View
        accessibilityViewIsModal
        accessibilityActions={[{ name: 'close', label: 'Lukk' }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'close') onDismiss();
        }}
        style={[
          styles.sheet,
          {
            backgroundColor: paint.color.surface.sheet,
            paddingBottom: Math.max(insetsBottom, paint.space['6']),
            borderTopLeftRadius: paint.radius.large,
            borderTopRightRadius: paint.radius.large,
          },
        ]}
      >
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Lukk"
          style={styles.handleHit}
          {...dragHandlers}
        >
          <View style={[styles.handle, { backgroundColor: paint.color.control.off }]} />
        </Pressable>

        <ContentColumn style={[styles.body, { gap: paint.space['4'] }]}>
          <ScreenTitle>Velg utseende</ScreenTitle>

          <View accessibilityRole="radiogroup" style={styles.options}>
            {APPEARANCE_OPTIONS.map((option, index) => {
              const selected = picked === option.id;
              const last = index === APPEARANCE_OPTIONS.length - 1;
              return (
                <AppearanceOption
                  key={option.id}
                  id={option.id}
                  label={option.label}
                  selected={selected}
                  last={last}
                  onPress={() => onChoose(option.id)}
                />
              );
            })}
          </View>

          <Button title={APPEARANCE_CONFIRM} size="comfort" onPress={onConfirm} style={{ alignSelf: 'stretch' }} />
        </ContentColumn>
      </View>
    </View>
  );
}

function AppearanceOption({
  id,
  label,
  selected,
  last,
  onPress,
}: {
  id: AppearanceId;
  label: string;
  selected: boolean;
  last: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const system = id === 'system';
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={system ? `${label}. ${APPEARANCE_SYSTEM_CAPTION}` : label}
      onPress={onPress}
      style={[
        styles.option,
        {
          paddingVertical: theme.space['3'],
          alignItems: system ? 'flex-start' : 'center',
        },
        !last && { borderBottomWidth: 1, borderBottomColor: theme.color.border.default },
      ]}
    >
      <View style={styles.optionCopy}>
        <Text style={[theme.text.label, { color: theme.color.text.primary }]}>{label}</Text>
        {system ? (
          <Text style={[theme.text.caption, { color: theme.color.text.tertiary, marginTop: theme.space['1'] }]}>
            {APPEARANCE_SYSTEM_CAPTION}
          </Text>
        ) : null}
      </View>
      {selected ? <Icon name="check" size={18} color={theme.color.ink.default} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1 },
  sheet: {},
  handleHit: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  handle: { width: 36, height: 4, borderRadius: 2 },
  body: {},
  options: { alignSelf: 'stretch' },
  option: {
    minHeight: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  optionCopy: { flex: 1, paddingRight: 12 },
});
