import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { APPEARANCE_OPTIONS, APPEARANCE_SYSTEM_CAPTION, type AppearanceId } from '@/data/copy';
import { screenPadding, useTheme, type ThemePreference } from '@/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Persistence failed. The sheet still closes; the screen shows the error. */
  onError?: () => void;
};

/**
 * Appearance sheet. The picked row stays local until «Bruk».
 * Dismissing the sheet throws the pick away and keeps the saved preference.
 */
export function AppearanceSheet({ visible, onClose, onError }: Props) {
  const { theme, preference, setPreference } = useTheme();
  const insets = useSafeAreaInsets();
  const [picked, setPicked] = useState<ThemePreference>(preference);

  useEffect(() => {
    if (!visible) return;
    setPicked(preference);
  }, [visible, preference]);

  const confirm = () => {
    setPreference(picked).catch(() => onError?.());
    onClose();
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

          <View style={[styles.body, { paddingHorizontal: screenPadding, gap: theme.space['4'] }]}>
            <Text accessibilityRole="header" style={[theme.text.headline, { color: theme.color.text.primary }]}>
              Velg utseende
            </Text>

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
                    onPress={() => setPicked(option.id)}
                  />
                );
              })}
            </View>

            <Button title="Bruk" size="comfort" onPress={confirm} style={{ alignSelf: 'stretch' }} />
          </View>
        </View>
      </View>
    </Modal>
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
