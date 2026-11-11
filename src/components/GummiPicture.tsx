import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { KLUMPEN_PATH } from '@/components/klumpenPath';
import {
  DURATION_UNIT,
  KLUMPEN_BOUNDS,
  klumpHeight,
  klumpWidth,
  minutesToIndex,
  SHEET_NUMBER_UNIT_GAP,
} from '@/duration/klumpen';
import { ENGRAVED_DIGIT_COLOR, ENGRAVED_FONT, ENGRAVED_SHADOW } from '@/materials/engraving';
import { engravedNumberSize } from '@/onboarding/flow';
import { useTheme } from '@/theme';

/** The four shipped Gummi rasters. Metro resolves the @3x file from the unsuffixed name. */
const GUMMI = [
  require('../../assets/hjem/klumpen-gummi-120pt.png'),
  require('../../assets/hjem/klumpen-gummi-160pt.png'),
  require('../../assets/hjem/klumpen-gummi-200pt.png'),
  require('../../assets/hjem/klumpen-gummi-240pt.png'),
] as const;

const MAX_INDEX = GUMMI.length - 1;
const FADE_MS = 180;
const PATH_LENGTH = pathLength(KLUMPEN_PATH);

type Props = {
  minutes: number;
  /** The guess screen frames every size with the 20-minute outline. */
  outline?: boolean;
  digits?: boolean;
  /** Replaces the minute numeral. The hold screen counts down here. */
  label?: string;
  ring?: { progress: number; opacity: number };
};

/** Fixed Gummi art for 5/10/15/20. No shader, no deformed path, no per-frame lighting. */
export function GummiPicture({ minutes, outline = false, digits = true, label, ring }: Props) {
  const { theme } = useTheme();
  const index = Math.max(0, Math.min(MAX_INDEX, minutesToIndex(minutes)));
  const [from, setFrom] = useState(index);
  const fade = useRef(new Animated.Value(1)).current;
  const target = useRef(index);
  target.current = index;
  const maxW = klumpWidth(MAX_INDEX);
  const maxH = klumpHeight(maxW);
  const width = klumpWidth(index);
  const height = klumpHeight(width);
  const fromW = klumpWidth(from);
  const fromH = klumpHeight(fromW);

  useEffect(() => {
    if (from === index) return;
    fade.setValue(0);
    const animation = Animated.timing(fade, { toValue: 1, duration: FADE_MS, useNativeDriver: true });
    animation.start(({ finished }) => {
      if (finished && target.current === index) setFrom(index);
    });
    return () => animation.stop();
  }, [fade, from, index]);

  const leaving = fade.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const box = `${KLUMPEN_BOUNDS.x} ${KLUMPEN_BOUNDS.y} ${KLUMPEN_BOUNDS.width} ${KLUMPEN_BOUNDS.height}`;
  const showRing = ring != null && ring.opacity > 0.02;
  const numberSize = label && label.length > 2 ? 36 : engravedNumberSize(minutes);

  return (
    <View style={{ width: maxW, height: maxH, alignItems: 'center', justifyContent: 'center' }}>
      {outline ? (
        <Svg width={maxW} height={maxH} viewBox={box} style={styles.back}>
          <Path
            d={KLUMPEN_PATH}
            fill="none"
            stroke={theme.color.text.tertiary}
            strokeWidth={KLUMPEN_BOUNDS.width / maxW}
          />
        </Svg>
      ) : null}
      {from !== index ? (
        <View pointerEvents="none" style={styles.face}>
          <Animated.Image
            source={GUMMI[from]}
            resizeMode="contain"
            style={{ width: fromW, height: fromH, opacity: leaving }}
          />
        </View>
      ) : null}
      <Animated.Image source={GUMMI[index]} resizeMode="contain" style={{ width, height, opacity: fade }} />
      {showRing && ring ? (
        <View pointerEvents="none" style={styles.face}>
          <Svg width={width} height={height} viewBox={box}>
            <Path
              d={KLUMPEN_PATH}
              fill="none"
              stroke={theme.color.text.tertiary}
              strokeWidth={(2 * KLUMPEN_BOUNDS.width) / width}
              strokeLinejoin="round"
              opacity={ring.opacity * 0.45}
            />
            <Path
              d={KLUMPEN_PATH}
              fill="none"
              stroke={theme.color.text.primary}
              strokeWidth={(2.5 * KLUMPEN_BOUNDS.width) / width}
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray={`${PATH_LENGTH} ${PATH_LENGTH}`}
              strokeDashoffset={PATH_LENGTH * (1 - Math.max(0, Math.min(1, ring.progress)))}
              opacity={ring.opacity}
            />
          </Svg>
        </View>
      ) : null}
      {digits ? (
        <View pointerEvents="none" style={styles.face}>
          <Text
            style={{
              fontFamily: ENGRAVED_FONT,
              fontSize: numberSize,
              color: ENGRAVED_DIGIT_COLOR,
              fontVariant: ['tabular-nums'],
              ...ENGRAVED_SHADOW,
            }}
          >
            {label ?? minutes}
          </Text>
          {label ? null : (
            <Text style={styles.unit}>{DURATION_UNIT}</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  back: { position: 'absolute' },
  face: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unit: {
    marginTop: SHEET_NUMBER_UNIT_GAP,
    fontFamily: ENGRAVED_FONT,
    fontSize: 13,
    lineHeight: 16,
    color: ENGRAVED_DIGIT_COLOR,
    ...ENGRAVED_SHADOW,
  },
});

/** Chord length of the cubic silhouette. Computed once, not per frame. */
function pathLength(d: string): number {
  const tokens = d.trim().split(/\s+/);
  let i = 0;
  let x = 0;
  let y = 0;
  let length = 0;
  let startX = 0;
  let startY = 0;
  while (i < tokens.length) {
    const cmd = tokens[i++];
    if (cmd === 'M') {
      x = Number(tokens[i++]);
      y = Number(tokens[i++]);
      startX = x;
      startY = y;
    } else if (cmd === 'C') {
      const x1 = Number(tokens[i++]);
      const y1 = Number(tokens[i++]);
      const x2 = Number(tokens[i++]);
      const y2 = Number(tokens[i++]);
      const x3 = Number(tokens[i++]);
      const y3 = Number(tokens[i++]);
      length += cubicLength(x, y, x1, y1, x2, y2, x3, y3);
      x = x3;
      y = y3;
    } else if (cmd === 'Z') {
      length += Math.hypot(startX - x, startY - y);
      x = startX;
      y = startY;
    }
  }
  return length;
}

function cubicLength(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
): number {
  let length = 0;
  let px = x0;
  let py = y0;
  for (let step = 1; step <= 8; step += 1) {
    const t = step / 8;
    const mt = 1 - t;
    const x = mt * mt * mt * x0 + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t * x3;
    const y = mt * mt * mt * y0 + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * y3;
    length += Math.hypot(x - px, y - py);
    px = x;
    py = y;
  }
  return length;
}
