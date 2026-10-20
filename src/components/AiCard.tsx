import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AI_UNLOCK_SESSIONS, MOCK_AI_SUGGESTION_MIN } from '@/data/mock';
import { useTheme } from '@/theme';

type Props = {
  sessionCount: number;
  onUse: (minutes: number) => void;
};

/** Mocked duration suggestion. No model call. Mount only when features.aiCard is on. */
export function AiCard({ sessionCount, onUse }: Props) {
  const { theme } = useTheme();
  const unlocked = sessionCount >= AI_UNLOCK_SESSIONS;
  const remaining = Math.max(0, AI_UNLOCK_SESSIONS - sessionCount);

  return (
    <View
      style={[
        styles.card,
        {
          borderRadius: theme.radius.medium,
          backgroundColor: unlocked ? theme.color.ink.default : theme.color.surface.default,
          opacity: unlocked ? 1 : 0.7,
        },
      ]}
    >
      <View style={styles.copy}>
        <Text
          style={[
            theme.text.labelSmall,
            { color: unlocked ? theme.color.text['on-ink'] : theme.color.text.tertiary },
          ]}
        >
          AI-forslag{unlocked ? '' : ' — låst'}
        </Text>
        <Text
          style={[
            theme.text.caption,
            {
              color: unlocked ? theme.color.text['on-ink'] : theme.color.text.secondary,
              opacity: unlocked ? 0.5 : 1,
            },
          ]}
        >
          {unlocked
            ? `Basert på ${AI_UNLOCK_SESSIONS}+ sesjoner: ${MOCK_AI_SUGGESTION_MIN} min passer deg nå.`
            : `Tilgjengelig etter ${AI_UNLOCK_SESSIONS} sesjoner. ${remaining} gjenstår.`}
        </Text>
      </View>
      {unlocked ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Bruk"
          onPress={() => onUse(MOCK_AI_SUGGESTION_MIN)}
          style={[
            styles.use,
            {
              backgroundColor: theme.color.text['on-ink'],
              borderRadius: theme.radius.pill,
            },
          ]}
        >
          <Text style={[theme.text.labelSmall, { color: theme.color.ink.default }]}>Bruk</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  copy: { flex: 1 },
  use: { minHeight: 44, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
});
