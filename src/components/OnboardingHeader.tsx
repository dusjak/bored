import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { ONBOARDING_STEPS } from '@/data/mock';
import { useTheme } from '@/theme';
import { Icon } from './Icon';
import { ProgressDots } from './ProgressDots';

/** Back control, progress, step count, title and subtitle. */
export function OnboardingHeader({ step, title, sub }: { step: number; title: string; sub: string }) {
  const { theme } = useTheme();
  return (
    <View>
      <View style={styles.bar}>
        <Pressable hitSlop={12} onPress={() => router.back()} accessibilityLabel="Tilbake" style={styles.back}>
          <Icon name="chevronLeft" size={18} color={theme.color.text.tertiary} />
        </Pressable>
        <ProgressDots total={ONBOARDING_STEPS} current={step} />
        <View style={styles.back} />
      </View>
      <Text style={[theme.text.eyebrow, { color: theme.color.text.tertiary, marginBottom: 10 }]}>
        {step + 1} av {ONBOARDING_STEPS}
      </Text>
      <Text style={[theme.text.headline, { color: theme.color.text.primary, marginBottom: 8 }]}>{title}</Text>
      <Text style={[theme.text.caption, { color: theme.color.text.tertiary, marginBottom: 32 }]}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 32,
  },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
