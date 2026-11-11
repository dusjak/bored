import { useRef, useState, type ReactNode } from 'react';
import { View, useWindowDimensions, type StyleProp, type ViewInstance, type ViewStyle } from 'react-native';

import { stoneCenterY } from '@/duration/klumpen';

type Props = {
  /** Layout height of the child. Its vertical centre sits on the shared line. */
  height: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Places the child so its centre is `stoneCenterY` on the window.
 * The leftover flex space around a title does not move the lump.
 */
export function StoneAnchor({ height, children, style }: Props) {
  const { height: windowHeight } = useWindowDimensions();
  const ref = useRef<ViewInstance>(null);
  const [origin, setOrigin] = useState(0);
  const place = () => {
    ref.current?.measureInWindow((_x, y) => {
      if (Number.isFinite(y)) setOrigin(y);
    });
  };
  const top = stoneCenterY(windowHeight) - origin - height / 2;
  return (
    <View ref={ref} onLayout={place} style={[{ flex: 1, overflow: 'visible' }, style]} pointerEvents="box-none">
      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top, alignItems: 'center' }}>
        {children}
      </View>
    </View>
  );
}
