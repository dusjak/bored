import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { KLUMPEN_PATH } from '@/components/klumpenPath';
import { tallyMarks } from '@/data/sessionQueries';
import {
  KLUMP,
  logMetrics,
  logSymbolRows,
  klumpenFrame,
  visibleTallyCount,
} from '@/data/klumper';
import type { SessionWithJournal } from '@/data/types';
import { useTheme } from '@/theme';

/**
 * Finished sessions as Klumpen lumps. Filled is completed, outline is aborted.
 * Hidden from VoiceOver; the caption below speaks the total once.
 */
export function SessionKlumps({
  sessions,
  expanded,
}: {
  sessions: SessionWithJournal[];
  expanded: boolean;
}) {
  const { theme } = useTheme();
  const [contentWidth, setContentWidth] = useState<number>(KLUMP.contentWidth);
  const allMarks = tallyMarks(sessions);
  const marks = allMarks.slice(0, visibleTallyCount(allMarks.length, expanded));
  if (marks.length === 0) return null;
  const metrics = logMetrics(contentWidth);
  const frame = klumpenFrame(metrics.width, metrics.stroke);
  const ink = theme.color.tally.default;
  const rows = logSymbolRows(marks);
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      onLayout={(event) => {
        const next = event.nativeEvent.layout.width;
        if (next > 0 && Math.abs(next - contentWidth) > 0.5) setContentWidth(next);
      }}
      style={{ gap: metrics.rowGap }}
    >
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={[styles.row, { gap: metrics.groupGap }]}>
          {row.map((group, groupIndex) => (
            <View key={groupIndex} style={[styles.group, { gap: metrics.gap }]}>
              {group.map((mark, index) => (
                <Klump key={index} aborted={mark.aborted} color={ink} frame={frame} />
              ))}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function Klump({
  aborted,
  color,
  frame,
}: {
  aborted: boolean;
  color: string;
  frame: ReturnType<typeof klumpenFrame>;
}) {
  return (
    <Svg width={frame.width} height={frame.height} viewBox={frame.viewBox}>
      <Path
        d={KLUMPEN_PATH}
        fill={aborted ? 'none' : color}
        stroke={color}
        strokeWidth={frame.strokeWidth}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  group: { flexDirection: 'row', alignItems: 'center' },
});
