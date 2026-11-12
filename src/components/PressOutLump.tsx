import { useEffect, useMemo } from 'react';
import {
  Blur,
  Canvas,
  Group,
  Image,
  LinearGradient,
  Path,
  Skia,
  useImage,
  vec,
} from '@shopify/react-native-skia';
import {
  Easing,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { KLUMPEN_PATH } from '@/components/klumpenPath';
import { KLUMPEN_BOUNDS, klumpHeight, klumpWidth } from '@/duration/klumpen';

const WIDTH = klumpWidth(1);
const HEIGHT = klumpHeight(WIDTH);
const FORM = Easing.bezier(0.45, 0, 0.2, 1);
const FIT = [
  { scaleX: WIDTH / KLUMPEN_BOUNDS.width },
  { scaleY: HEIGHT / KLUMPEN_BOUNDS.height },
  { translateX: -KLUMPEN_BOUNDS.x },
  { translateY: -KLUMPEN_BOUNDS.y },
];

/**
 * B2 A. A flat of the page colour rises into a dome from 0.35 s to 2.6 s,
 * then the real 10-minute Gummi fades over it from 1.9 s to 2.75 s.
 */
export function PressOutLump() {
  const reduceMotion = useReducedMotion() === true;
  const bulge = useSharedValue(reduceMotion ? 1 : 0);
  const gummi = useSharedValue(reduceMotion ? 1 : 0);
  const image = useImage(require('../../assets/hjem/klumpen-gummi-160pt.png'));
  const path = useMemo(() => Skia.Path.MakeFromSVGString(KLUMPEN_PATH), []);

  useEffect(() => {
    if (reduceMotion) return;
    bulge.value = withDelay(350, withTiming(1, { duration: 2250, easing: FORM }));
    gummi.value = withDelay(1900, withTiming(1, { duration: 850, easing: Easing.bezier(0.2, 0, 0, 1) }));
  }, [bulge, gummi, reduceMotion]);

  const rise = useDerivedValue(() => {
    const scaleY = 0.06 + 0.94 * bulge.value;
    return [
      { translateX: WIDTH / 2 },
      { translateY: HEIGHT },
      { scaleY },
      { translateX: -WIDTH / 2 },
      { translateY: -HEIGHT },
    ];
  });
  const blur = useDerivedValue(() => 15 - 14 * bulge.value);
  const shade = useDerivedValue(() => 0.05 + 0.22 * bulge.value);
  const picture = useDerivedValue(() => gummi.value);

  if (!path) return null;
  return (
    <Canvas style={{ width: WIDTH, height: HEIGHT }}>
      <Group transform={rise}>
        <Group transform={FIT}>
          <Blur blur={blur}>
            <Path path={path}>
              <LinearGradient
                start={vec(180, 40)}
                end={vec(700, 820)}
                colors={['#6A675F', '#111110']}
              />
            </Path>
          </Blur>
        </Group>
      </Group>
      <Group opacity={shade} transform={[{ translateY: 8 }, { translateX: WIDTH / 2 }, { translateY: HEIGHT }, { scaleY: 0.18 }, { translateX: -WIDTH / 2 }, { translateY: -HEIGHT }]}>
        <Group transform={FIT}>
          <Path path={path} color="#000000" />
        </Group>
      </Group>
      {image ? <Image image={image} x={0} y={0} width={WIDTH} height={HEIGHT} fit="fill" opacity={picture} /> : null}
    </Canvas>
  );
}
