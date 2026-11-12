import type { ReactNode } from 'react';
import { View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { stoneCenterY } from '@/duration/klumpen';

type Props = {
  /** Layout height of the child. Its vertical centre sits on the shared line. */
  height: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Absolute lump slot. The centre is `stoneCenterY` from the top of the window,
 * measured from the safe-area edge. It does not sit in the flex space under
 * the title, so a two-line title cannot push it down.
 * The parent must be the screen column (a direct child of `Screen`).
 */
export function StoneAnchor({ height, children, style }: Props) {
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const top = stoneCenterY(windowHeight) - insets.top - height / 2;
  return (
    <View
      pointerEvents="box-none"
      style={[{ position: 'absolute', left: 0, right: 0, top, alignItems: 'center', zIndex: 1 }, style]}
    >
      {children}
    </View>
  );
}
