import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { Button } from '@/components/Button';
import { OnboardingHeader } from '@/components/OnboardingHeader';
import { OPTION_LIST_GAP } from '@/components/OptionCard';
import { Screen } from '@/components/Screen';
import {
  confirmedMinutes,
  FORK_BODY,
  FORK_KNOWN,
  FORK_LATER,
  FORK_NOW,
  FORK_OPEN,
  FORK_TITLE,
  forkDurationLine,
} from '@/onboarding/flow';
import { useAppState } from '@/state/AppState';
import { useTheme } from '@/theme';

/** Bridge after the practice. Receipt of what is learned, then the questions or the skip. */
export default function Veiskille() {
  const { theme } = useTheme();
  const { user, updateUser } = useAppState();
  const minutes = confirmedMinutes(user.duration);
  const known = [FORK_KNOWN[0], forkDurationLine(minutes), FORK_KNOWN[1]];

  const tailor = () => {
    updateUser({ introPath: 'del2', duration: String(minutes), materialId: user.materialId ?? 'gummi' });
    router.push('/onboarding/distraction');
  };

  const skip = () => {
    updateUser({ introPath: 'skip', duration: String(minutes), materialId: user.materialId ?? 'gummi' });
    router.push({ pathname: '/onboarding/name', params: { after: 'ready' } });
  };

  return (
    <Screen top="none" contentStyle={styles.content}>
      <OnboardingHeader step={0} bodySub title={FORK_TITLE} sub={FORK_BODY} />
      <View style={styles.lists}>
        <ReceiptGroup label={FORK_NOW} items={known} done />
        <ReceiptGroup label={FORK_LATER} items={FORK_OPEN} done={false} />
      </View>
      <Button title="Tilpass øktene" onPress={tailor} />
      <Button title="Hopp over" variant="ghost" style={{ marginTop: 8 }} onPress={skip} />
    </Screen>
  );
}

function ReceiptGroup({ label, items, done }: { label: string; items: readonly string[]; done: boolean }) {
  const { theme } = useTheme();
  return (
    <View accessibilityRole="list" accessibilityLabel={label}>
      <Text style={[theme.text.caption, { color: theme.color.text.tertiary, marginBottom: OPTION_LIST_GAP }]}>
        {label}
      </Text>
      <View style={{ gap: OPTION_LIST_GAP }}>
        {items.map((item) => (
          <View key={item} style={styles.row} accessibilityRole="text">
            <ReceiptMark done={done} />
            <Text style={[theme.text.body, { color: theme.color.text.primary, flex: 1 }]}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ReceiptMark({ done }: { done: boolean }) {
  const { theme } = useTheme();
  const ink = theme.color.text.primary;
  const idle = theme.color.text.tertiary;
  return (
    <Svg width={22} height={22} viewBox="0 0 22 22">
      <Circle cx={11} cy={11} r={9} fill={done ? ink : 'none'} stroke={done ? ink : idle} strokeWidth={1.5} />
      {done ? (
        <Polyline
          points="6.5 11.2 9.4 14.2 15.5 8"
          fill="none"
          stroke={theme.color.text['on-ink']}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
    </Svg>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  lists: { flex: 1, marginTop: 28, gap: 28 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 28 },
});
