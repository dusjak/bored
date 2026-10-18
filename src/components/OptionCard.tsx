import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { colors, fonts, onDark, palette } from '@/theme';
import { Icon } from './Icon';

type Props = {
  label: string;
  sub?: string;
  icon?: string;
  selected: boolean;
  onPress: () => void;
};

/** Onboarding option card. Selected = filled near-black. */
export function OptionCard({ label, sub, icon, selected, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [
        styles.card,
        selected && styles.selected,
        pressed && { opacity: 0.75, transform: [{ scale: 0.98 }] },
      ]}
    >
      {icon != null && (
        <View style={[styles.iconBox, selected && { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
          <Text style={[styles.iconText, selected && { color: onDark.fg }]}>{icon}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={[styles.label, selected && { color: onDark.fg }]}>{label}</Text>
        {sub ? <Text style={[styles.sub, selected && { color: 'rgba(248,246,242,0.45)' }]}>{sub}</Text> : null}
      </View>
      {selected && <Icon name="check" size={18} color={colors.accent} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(17,17,16,0.14)',
    marginBottom: 10,
  },
  selected: { backgroundColor: colors.fg, borderColor: colors.fg },
  label: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.fg },
  sub: { fontFamily: fonts.sansLight, fontSize: 12, color: colors.fgTertiary, marginTop: 2 },
  iconBox: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.mono200,
    borderRadius: 2,
  },
  iconText: { fontSize: 18, color: colors.fgTertiary },
});
