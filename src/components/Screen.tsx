import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useTheme } from '@/theme';

type Props = {
  children: ReactNode;
  /** Active session and the dark summary. Ignores the chosen theme. */
  session?: boolean;
  scroll?: boolean;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
  background?: string;
  statusBar?: 'light' | 'dark';
};

/** Screen shell: status bar, then content with the 28pt horizontal margin. */
export function Screen({ children, session, scroll, edges = ['top', 'bottom'], contentStyle, background, statusBar }: Props) {
  const { theme } = useTheme();
  const bg = background ?? (session ? theme.color.bg.session : theme.color.bg.default);
  const bar = statusBar ?? (session ? 'light' : theme.statusBar);
  return (
    <SafeAreaView edges={edges} style={[styles.root, { backgroundColor: bg }]}>
      <StatusBar style={bar} />
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingHorizontal: theme.space['7'] }, contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, { flex: 1, paddingHorizontal: theme.space['7'] }, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {},
});
