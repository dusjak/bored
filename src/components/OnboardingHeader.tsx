import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { ONBOARDING_STEPS } from '@/data/mock';
import { colors, type } from '@/theme';
import { Icon } from './Icon';
import { ProgressDots } from './ProgressDots';

/** Back chevron + progress dots + "n av 7" eyebrow, title and subtitle. */
export function OnboardingHeader({ step, title, sub }: { step: number; title: string; sub: string }) {
  return (
    <View>
      <View style={styles.bar}>
        <Pressable hitSlop={12} onPress={() => router.back()} accessibilityLabel="Tilbake">
          <Icon name="chevronLeft" size={18} color={colors.fgTertiary} />
        </Pressable>
        <ProgressDots total={ONBOARDING_STEPS} current={step} />
        <View style={{ width: 22 }} />
      </View>
      <Text style={[type.eyebrow, { marginBottom: 10 }]}>
        {step + 1} av {ONBOARDING_STEPS}
      </Text>
      <Text style={[type.display(28), { marginBottom: 8 }]}>{title}</Text>
      <Text style={[type.caption, { marginBottom: 32 }]}>{sub}</Text>
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
});
