import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/theme';
import { FyllingIcon } from './FyllingIcon';
import type { FyllingName } from '../data/fylling';
import { Icon } from './Icon';

type Props = {
  label: string;
  sub?: string;
  icon?: FyllingName;
  selected: boolean;
  onPress?: () => void;
  /** Painted preview. No press and no radio focus. */
  inert?: boolean;
  /** Del 2 card: 68 pt, 10 pt gap, 12 pt radius, 1 pt #2B2A27 edge. */
  question?: boolean;
};

/** Space between Del 2 option cards. The card margin is the gap. Do not add another. */
export const OPTION_LIST_GAP = 10;

/** Onboarding option. Selected uses the ink fill. */
export function OptionCard({ label, sub, icon, selected, onPress, inert = false, question = false }: Props) {
  const { theme } = useTheme();
  const card = [
    styles.card,
    question && styles.question,
    {
      borderColor: selected ? theme.color.button['primary-bg'] : question ? '#2B2A27' : theme.color.border.strong,
      backgroundColor: selected ? theme.color.button['primary-bg'] : 'transparent',
      borderRadius: question ? 12 : theme.radius.medium,
    },
  ];
  const body = (
    <>
      {icon != null ? (
        <FyllingIcon
          name={icon}
          color={selected ? theme.color.button['primary-text'] : theme.color.text.primary}
        />
      ) : null}
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
    </>
  );
  if (inert) return <View style={card}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={() => {
        Haptics.selectionAsync();
        onPress?.();
      }}
      style={({ pressed }) => [card, pressed && { opacity: 0.75 }]}
    >
      {body}
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
    marginBottom: OPTION_LIST_GAP,
    minHeight: 44,
  },
  question: {
    height: 68,
    minHeight: 68,
    marginBottom: OPTION_LIST_GAP,
    paddingVertical: 0,
    borderWidth: 1,
  },
});
