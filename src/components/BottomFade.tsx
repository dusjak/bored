import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useWindowDimensions } from 'react-native';

import { deg } from '@/theme/deg';

/** 150pt fade in the screen color, sitting under the tab bar. */
export function BottomFade({ color }: { color: string }) {
  const { width } = useWindowDimensions();
  const height = deg.fadeHeight;
  return (
    <View pointerEvents="none" style={[styles.fade, { height }]}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="bored-bottom-fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0} />
            <Stop offset="1" stopColor={color} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#bored-bottom-fade)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
