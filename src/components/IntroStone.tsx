import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSharedValue } from 'react-native-reanimated';

import { engravedNumberSize } from '@/onboarding/flow';
import { stonePath } from '@/onboarding/formShape';
import {
  DURATION_UNIT,
  KLUMP_ASPECT,
  SHEET_NUMBER_UNIT_GAP,
  STONE_COLOR,
  klumpWidth,
  minutesToIndex,
} from '@/duration/klumpen';
import type { KlumpMaterialId } from '@/data/types';
import { useTheme } from '@/theme';
import { KlumpenBody } from './Klumpen';

type Props = {
  minutes: number;
  material: KlumpMaterialId;
  offsets: readonly number[];
  dark?: boolean;
};

/** Gummi at rest uses the live stone. A saved form, or another material, uses the silhouette. */
export function IntroStone({ minutes, material, offsets, dark = false }: Props) {
  const { theme } = useTheme();
  const index = minutesToIndex(minutes);
  const indexSv = useSharedValue(index);
  const reduceSv = useSharedValue(0);
  const from = useSharedValue(index);
  const to = useSharedValue(index);
  const u = useSharedValue(1);
  useEffect(() => {
    indexSv.value = index;
    from.value = index;
    to.value = index;
  }, [from, index, indexSv, to]);
  const deformed = offsets.some((value) => Math.abs(value) > 0.05);
  const width = klumpWidth(index);
  if (!deformed && material === 'gummi') {
    return (
      <KlumpenBody
        index={indexSv}
        minutes={minutes}
        reduce={reduceSv}
        reduceMotion={false}
        fade={{ from, to, u }}
        unitGap={SHEET_NUMBER_UNIT_GAP}
        numberFamily={theme.fonts.sans}
        unitColor={dark ? '#F8F6F2' : theme.color.bg.grouped}
      />
    );
  }
  const height = width * KLUMP_ASPECT;
  return (
    <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={width} height={height} viewBox={`0 77.233 1000 ${845.53}`}>
        <Path d={stonePath(offsets)} fill={STONE_COLOR} />
      </Svg>
      <View pointerEvents="none" style={styles.face}>
        <Text
          style={{
            fontFamily: theme.fonts.sans,
            fontSize: engravedNumberSize(minutes),
            color: '#F8F6F2',
            fontVariant: ['tabular-nums'],
          }}
        >
          {minutes}
        </Text>
        <Text style={[styles.unit, { color: '#F8F6F2', fontFamily: theme.fonts.sans }]}>{DURATION_UNIT}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  face: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  unit: { marginTop: SHEET_NUMBER_UNIT_GAP, fontSize: 13, lineHeight: 16 },
});
