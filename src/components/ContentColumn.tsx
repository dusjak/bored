import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { contentColumn, contentFrame } from '@/theme';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Sheet body. Same column as `Screen`: 24pt minimum side inset, 345pt max, centered.
 * Primary buttons inside stretch to that width.
 */
export function ContentColumn({ children, style }: Props) {
  return (
    <View style={contentFrame}>
      <View style={[contentColumn, style]}>{children}</View>
    </View>
  );
}
