import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/theme';
import { Icon } from './Icon';

type Props = {
  label: string;
  sub?: string;
  icon?: string;
  selected: boolean;
  onPress: () => void;
};

/** Onboarding option. Selected uses the ink fill. */
export function OptionCard({ label, sub, icon, selected, onPress }: Props) {
  const { theme } = useTheme();
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
        {
          borderColor: selected ? theme.color.button['primary-bg'] : theme.color.border.strong,
          backgroundColor: selected ? theme.color.button['primary-bg'] : 'transparent',
          borderRadius: theme.radius.medium,
        },
        pressed && { opacity: 0.75 },
      ]}
    >
      {icon != null && (
        <View
          style={[
            styles.iconBox,
            { backgroundColor: selected ? theme.color.glass.selected : theme.color.button['tertiary-bg'] },
          ]}
        >
          <Text style={[styles.iconText, { color: selected ? theme.color.button['primary-text'] : theme.color.text.tertiary }]}>
            {icon}
          </Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={[theme.text.label, { color: selected ? theme.color.button['primary-text'] : theme.color.text.primary }]}>
          {label}
        </Text>
        {sub ? (
          <Text
            style={[
              theme.text.caption,
              { color: selected ? theme.color.button['primary-text'] : theme.color.text.tertiary, marginTop: 2 },
            ]}
          >
            {sub}
          </Text>
        ) : null}
      </View>
      {selected ? <Icon name="check" size={18} color={theme.color.button['primary-text']} /> : null}
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
    marginBottom: 10,
    minHeight: 44,
  },
  iconBox: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
  },
  iconText: { fontSize: 18 },
});
