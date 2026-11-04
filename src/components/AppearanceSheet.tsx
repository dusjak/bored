import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { Pressable, StyleSheet, Text, View, type HostInstance } from 'react-native';

import { Button } from '@/components/Button';
import { ContentColumn } from '@/components/ContentColumn';
import { Icon } from '@/components/Icon';
import { ScreenTitle } from '@/components/ScreenTitle';
import { Sheet } from '@/components/Sheet';
import { APPEARANCE_CONFIRM, APPEARANCE_OPTIONS, APPEARANCE_SYSTEM_CAPTION, type AppearanceId } from '@/data/copy';
import { ThemeOverride, useTheme, type ThemePreference } from '@/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Persistence failed. The sheet still closes; the screen shows the error. */
  onError?: () => void;
  /** Focus returns to the control that opened the sheet. */
  returnFocusRef?: RefObject<HostInstance | null>;
};

/**
 * Appearance sheet. A tap previews on the whole app, including this sheet.
 * Dragging down, tapping outside, or back drops the preview.
 * «Velg» is the only path that writes the preference.
 */
export function AppearanceSheet({ visible, onClose, onError, returnFocusRef }: Props) {
  const live = useTheme();
  const { preference, previewPreference, revertPreview, setPreference } = live;
  const frozen = useRef(live.theme);
  const paint = visible ? live.theme : frozen.current;
  if (visible) frozen.current = live.theme;

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

  const confirm = () => {
    setPreference(picked).catch(() => onError?.());
    onClose();
  };

  const choose = (id: ThemePreference) => {
    setPicked(id);
    previewPreference(id);
  };

  return (
    <ThemeOverride theme={paint}>
      <Sheet visible={visible} onClose={dismiss} returnFocusRef={returnFocusRef}>
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
                  onPress={() => choose(option.id)}
                />
              );
            })}
          </View>

          <Button title={APPEARANCE_CONFIRM} size="comfort" onPress={confirm} style={{ alignSelf: 'stretch' }} />
        </ContentColumn>
      </Sheet>
    </ThemeOverride>
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
  body: {},
  options: { alignSelf: 'stretch' },
  option: {
    minHeight: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  optionCopy: { flex: 1, paddingRight: 12 },
});
