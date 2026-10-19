import { StyleSheet, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';

import { tallyMarks } from '@/data/sessionQueries';
import type { SessionWithJournal } from '@/data/types';
import { useTheme } from '@/theme';

const GROUP = 5;

/** Groups of five. The fifth stroke crosses the four before it. Hidden from VoiceOver. */
export function TallyMarks({ sessions }: { sessions: SessionWithJournal[] }) {
  const { theme } = useTheme();
  const marks = tallyMarks(sessions);
  if (marks.length === 0) return null;
  const groups: { aborted: boolean }[][] = [];
  for (let index = 0; index < marks.length; index += GROUP) {
    groups.push(marks.slice(index, index + GROUP));
  }
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={styles.row}
    >
      {groups.map((group, groupIndex) => (
        <TallyGroup key={groupIndex} marks={group} ink={theme.color.tally.default} muted={theme.color.tally.interrupted} />
      ))}
    </View>
  );
}

function TallyGroup({
  marks,
  ink,
  muted,
}: {
  marks: { aborted: boolean }[];
  ink: string;
  muted: string;
}) {
  const stroke = (aborted: boolean) => (aborted ? muted : ink);
  const upright = [6, 12, 18, 24];
  return (
    <Svg width={36} height={28}>
      {marks.slice(0, 4).map((mark, index) => (
        <Line
          key={upright[index]}
          x1={upright[index]}
          y1={3}
          x2={upright[index]}
          y2={25}
          stroke={stroke(mark.aborted)}
          strokeWidth={1.75}
          strokeLinecap="round"
        />
      ))}
      {marks[4] ? (
        <Line
          x1={3}
          y1={23}
          x2={28}
          y2={4}
          stroke={stroke(marks[4].aborted)}
          strokeWidth={1.75}
          strokeLinecap="round"
        />
      ) : null}
    </Svg>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 12 },
});
