import type { ReactNode } from 'react';
import { View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';

import { contentColumnForWidth, contentFrame } from '@/theme';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Sheet body. Same column as `Screen`: 24pt side inset on phones, 345pt cap from tablet width.
 * Primary buttons inside stretch to that width.
 */
export function ContentColumn({ children, style }: Props) {
  const { width } = useWindowDimensions();
  return (
    <View style={contentFrame}>
      <View style={[contentColumnForWidth(width), style]}>{children}</View>
    </View>
  );
}
