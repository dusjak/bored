import type { ReactNode } from 'react';
import { Children } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { deg } from '@/theme/deg';
import { useTheme } from '@/theme';

/** Inset group. No heading. Explanations sit under the card, not behind a line. */
export function SettingsGroup({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  const { theme } = useTheme();
  const rows = Children.toArray(children);
  return (
    <View>
      <View style={[styles.card, { backgroundColor: theme.color.surface.grouped, borderRadius: deg.groupRadius }]}>
        {rows.map((row, index) => (
          <View key={index}>
            {index > 0 ? (
              <View
                style={{
                  height: deg.separator,
                  // Leading inset only. The reference runs the hairline to the trailing edge.
                  marginLeft: deg.rowInset,
                  backgroundColor: theme.color.border.separator,
                }}
              />
            ) : null}
            {row}
          </View>
        ))}
      </View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

/** 8×13 chevron, 2pt stroke. */
export function RowChevron() {
  const { theme } = useTheme();
  return (
    <Svg width={deg.chevronWidth} height={deg.chevronHeight} viewBox="0 0 8 13" fill="none">
      <Path
        d="M1.5 1.5 L6.5 6.5 L1.5 11.5"
        stroke={theme.color.icon.chevron}
        strokeWidth={deg.chevronStroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  footer: { marginTop: deg.footerGap, paddingHorizontal: deg.rowInset },
});
