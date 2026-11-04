import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { KLUMPEN_PATH } from '@/components/klumpenPath';
import { tallyMarks } from '@/data/sessionQueries';
import { KLUMP, LOG_KLUMP_SPACING, groupKlumper, klumpenFrame } from '@/data/klumper';
import type { SessionWithJournal } from '@/data/types';
import { useTheme } from '@/theme';

const FRAME = klumpenFrame(KLUMP.width, KLUMP.stroke);

/**
 * Finished sessions as Klumpen lumps. Filled is completed, outline is aborted.
 * Hidden from VoiceOver; the count above already speaks the total.
 */
export function SessionKlumps({ sessions }: { sessions: SessionWithJournal[] }) {
  const { theme } = useTheme();
  const marks = tallyMarks(sessions);
  if (marks.length === 0) return null;
  const ink = theme.name === 'dark' ? theme.color.tally.default : KLUMP.ink;
  const groups = groupKlumper(marks);
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={styles.row}
    >
      {groups.map((group, groupIndex) => (
        <View key={groupIndex} style={styles.group}>
          {group.map((mark, index) => (
            <Klump key={index} aborted={mark.aborted} color={ink} />
          ))}
        </View>
      ))}
    </View>
  );
}

function Klump({ aborted, color }: { aborted: boolean; color: string }) {
  return (
    <Svg width={FRAME.width} height={FRAME.height} viewBox={FRAME.viewBox}>
      <Path
        d={KLUMPEN_PATH}
        fill={aborted ? 'none' : color}
        stroke={color}
        strokeWidth={FRAME.strokeWidth}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: KLUMP.groupGap,
    rowGap: KLUMP.rowGap,
    marginTop: LOG_KLUMP_SPACING.aboveCount,
  },
  group: { flexDirection: 'row', alignItems: 'center', gap: KLUMP.gap },
});
