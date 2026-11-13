import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { contentColumnForWidth, contentFrame, insetUnderSafeArea, useTheme, type ScreenTop } from '@/theme';

type Props = {
  children: ReactNode;
  /** Active session and the dark summary. Ignores the chosen theme. */
  session?: boolean;
  scroll?: boolean;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
  background?: string;
  statusBar?: 'light' | 'dark';
  /**
   * Inset under the safe area.
   * `gutter` is the 24pt side token. `app` is 40. `welcome` is 128.
   * `none` lets a nav row sit on the safe area (intro questions).
   */
  top?: ScreenTop;
};

/**
 * Screen shell. Side inset 24 on phones. The 345pt cap starts at tablet width.
 * Top inset follows `top`. Safe area is the SafeAreaView, not part of the padding.
 */
export function Screen({
  children,
  session,
  scroll,
  edges = ['top', 'bottom'],
  contentStyle,
  background,
  statusBar,
  top = 'gutter',
}: Props) {
  const { theme } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const column = contentColumnForWidth(windowWidth);
  const bg = background ?? (session ? theme.color.bg.session : theme.color.bg.default);
  const bar = statusBar ?? (session ? 'light' : theme.statusBar);
  const paddingTop = insetUnderSafeArea(top);
  return (
    <SafeAreaView edges={edges} style={[styles.root, { backgroundColor: bg }]}>
      <StatusBar style={bar} />
      <View style={[contentFrame, styles.fill]}>
        {scroll ? (
          <ScrollView
            style={[column, styles.fill]}
            contentContainerStyle={[styles.grow, { paddingTop }, contentStyle]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[column, styles.fill, { paddingTop }, contentStyle]}>{children}</View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  grow: { flexGrow: 1, width: '100%' },
});
