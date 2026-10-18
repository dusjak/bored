import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { useAppState } from '@/state/AppState';
import { useTheme, type ThemePreference } from '@/theme';

const APPEARANCE: { id: ThemePreference; label: string }[] = [
  { id: 'light', label: 'Lys' },
  { id: 'dark', label: 'Mørk' },
  { id: 'system', label: 'Automatisk' },
];

/** Deg. Appearance is Lys, Mørk or Automatisk. */
export default function Profile() {
  const { theme, preference, setPreference } = useTheme();
  const { user } = useAppState();

  return (
    <Screen scroll edges={['top']} contentStyle={styles.content}>
      {user.name ? (
        <Text style={[theme.text.headline, { color: theme.color.text.primary, marginBottom: theme.space['8'] }]}>
          {user.name}
        </Text>
      ) : null}

      <Text style={[theme.text.eyebrow, { color: theme.color.text.tertiary, marginBottom: theme.space['2'] }]}>Utseende</Text>
      {APPEARANCE.map((option) => {
        const selected = preference === option.id;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => {
              setPreference(option.id).catch(() => undefined);
            }}
            style={[styles.row, { borderBottomColor: theme.color.border.default }]}
          >
            <Text style={[theme.text.label, { color: theme.color.text.primary }]}>{option.label}</Text>
            {selected ? <Icon name="check" size={18} color={theme.color.ink.default} /> : <View style={styles.checkSpace} />}
          </Pressable>
        );
      })}
      <Text style={[theme.text.caption, { color: theme.color.text.tertiary, marginTop: theme.space['3'] }]}>
        Automatisk følger telefonen.
      </Text>

      <View style={{ marginTop: theme.space['10'] }}>
        <Text style={[theme.text.eyebrow, { color: theme.color.text.tertiary, marginBottom: theme.space['4'] }]}>
          Om bored.
        </Text>
        <View style={[styles.quote, { borderLeftColor: theme.color.border.default }]}>
          <Text style={[theme.text.bodySmall, { color: theme.color.text.secondary }]}>
            «Kjedsomhet er drømmefuglen som ruger ut erfaringens egg.»
          </Text>
          <Text style={[theme.text.caption, { color: theme.color.text.tertiary, marginTop: theme.space['2'] }]}>
            — Walter Benjamin
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 8, paddingBottom: 140 },
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  checkSpace: { width: 18 },
  quote: { borderLeftWidth: 2, paddingLeft: 16 },
});
