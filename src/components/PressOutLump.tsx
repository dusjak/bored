import { useEffect, useMemo } from 'react';
import { Blur, Canvas, Group, Image, LinearGradient, Path, Skia, useImage, vec } from '@shopify/react-native-skia';
import { Easing, useDerivedValue, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { KLUMPEN_PATH } from '@/components/klumpenPath';
import { KLUMPEN_BOUNDS, klumpHeight, klumpWidth } from '@/duration/klumpen';
import { useTheme } from '@/theme';

const WIDTH = klumpWidth(1);
const HEIGHT = klumpHeight(WIDTH);
const FORM = Easing.bezier(0.45, 0, 0.2, 1);

/** The Klumpen outline in the 160 pt box, so the dome and the Gummi share one silhouette. */
function fittedLump() {
  const raw = Skia.Path.MakeFromSVGString(KLUMPEN_PATH);
  if (!raw) return null;
  const sx = WIDTH / KLUMPEN_BOUNDS.width;
  const sy = HEIGHT / KLUMPEN_BOUNDS.height;
  const builder = Skia.PathBuilder.Make();
  builder.addPath(raw);
  builder.transform([sx, 0, -KLUMPEN_BOUNDS.x * sx, 0, sy, -KLUMPEN_BOUNDS.y * sy, 0, 0, 1]);
  return builder.build();
}

/**
 * B2 A. A page-coloured surface bulges from the centre, 0.35 s to 2.6 s.
 * The height map goes from a wide soft blur (45 px) to the full dome (3 px),
 * lit from the upper left, with a cast shadow growing down-right.
 * The real 10-minute Gummi fades over it from 1.9 s to 2.75 s.
 */
export function PressOutLump() {
  const { theme } = useTheme();
  const bulge = useSharedValue(0);
  const gummi = useSharedValue(0);
  const image = useImage(require('../../assets/hjem/klumpen-gummi-160pt.png'));
  const path = useMemo(() => fittedLump(), []);
  const dark = theme.name === 'dark';
  const page = theme.color.bg.default;
  const lit = dark ? '#6A675F' : '#FFFFFF';

  useEffect(() => {
    bulge.value = withDelay(350, withTiming(1, { duration: 2250, easing: FORM }));
    gummi.value = withDelay(1900, withTiming(1, { duration: 850, easing: Easing.bezier(0.2, 0, 0, 1) }));
  }, [bulge, gummi]);

  const dome = useDerivedValue(() => {
    const scale = 0.72 + 0.28 * bulge.value;
    return [
      { translateX: WIDTH / 2 },
      { translateY: HEIGHT / 2 },
      { scale },
      { translateX: -WIDTH / 2 },
      { translateY: -HEIGHT / 2 },
    ];
  });
  const shadowShift = useDerivedValue(() => {
    const scale = 0.72 + 0.28 * bulge.value;
    const dx = 2 + 8 * bulge.value;
    const dy = 8 + 10 * bulge.value;
    return [
      { translateX: WIDTH / 2 + dx },
      { translateY: HEIGHT / 2 + dy },
      { scaleX: scale * 0.92 },
      { scaleY: scale * 0.55 },
      { translateX: -WIDTH / 2 },
      { translateY: -HEIGHT / 2 },
    ];
  });
  const blur = useDerivedValue(() => 15 - 14 * bulge.value);
  const shadowBlur = useDerivedValue(() => 16 - 4 * bulge.value);
  const shade = useDerivedValue(() => 0.08 + 0.32 * bulge.value);
  const body = useDerivedValue(() => 0.35 + 0.65 * bulge.value);
  const picture = useDerivedValue(() => gummi.value);

  if (!path) return null;
  return (
    <Canvas style={{ width: WIDTH, height: HEIGHT }}>
      <Group transform={shadowShift} opacity={shade}>
        <Blur blur={shadowBlur}>
          <Path path={path} color="#000000" />
        </Blur>
      </Group>
      <Group transform={dome} opacity={body}>
        <Blur blur={blur}>
          <Path path={path}>
            <LinearGradient start={vec(WIDTH * 0.18, HEIGHT * 0.12)} end={vec(WIDTH * 0.82, HEIGHT * 0.88)} colors={[lit, page]} />
          </Path>
        </Blur>
      </Group>
      {image ? <Image image={image} x={0} y={0} width={WIDTH} height={HEIGHT} fit="fill" opacity={picture} /> : null}
    </Canvas>
  );
}
