import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions, type HostInstance, type TextStyle } from 'react-native';
import Svg, { Path as SvgPath } from 'react-native-svg';
import {
  Blur,
  Canvas,
  Group,
  LinearGradient,
  Path,
  Skia,
  vec,
  type Transforms3d,
} from '@shopify/react-native-skia';
import Animated, {
  Easing,
  runOnUI,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KLUMPEN_PATH } from '@/components/klumpenPath';
import {
  CROSSFADE_MS,
  DURATION_HOME_HINT,
  DURATION_UNIT,
  HINT_GAP,
  HOME_APPLY_DELAY,
  HOME_STONE_CENTER_Y,
  KLUMP_ASPECT,
  KLUMP_WIDTH_MIN,
  KLUMP_WIDTH_STEP,
  KLUMPEN_BOUNDS,
  ROLL_DISTANCE,
  ROLL_IN_DELAY,
  ROLL_IN_MS,
  ROLL_OUT_MS,
  SIZE_SPRING,
  STONE_COLOR,
  STONE_NUMBER_COLOR,
  STONE_UNIT_COLOR,
  durationType,
  homeKlumpenLabel,
  klumpHeight,
  klumpWidth,
  minutesToIndex,
  rollTravel,
} from '@/duration/klumpen';
import { screenPadding, useTheme } from '@/theme';

const PAD = 36;
const MAX_W = klumpWidth(3);
const MAX_H = klumpHeight(MAX_W);
const CANVAS_W = MAX_W + PAD * 2;
const CANVAS_H = MAX_H + PAD * 2;
const BOX_W = KLUMPEN_BOUNDS.width;
const ORIGIN_X = KLUMPEN_BOUNDS.x + BOX_W / 2;
const ORIGIN_Y = KLUMPEN_BOUNDS.y + KLUMPEN_BOUNDS.height / 2;

type Fade = {
  from: SharedValue<number>;
  to: SharedValue<number>;
  u: SharedValue<number>;
};

export function crossfadeTo(fade: Fade, next: number) {
  const ms = CROSSFADE_MS;
  runOnUI(() => {
    'worklet';
    fade.from.value = fade.to.value;
    fade.to.value = next;
    fade.u.value = 0;
    fade.u.value = withTiming(1, { duration: ms, easing: Easing.linear });
  })();
}

function stoneTransform(index: number): Transforms3d {
  'worklet';
  const width = KLUMP_WIDTH_MIN + KLUMP_WIDTH_STEP * index;
  const scale = width / BOX_W;
  return [
    { translateX: CANVAS_W / 2 },
    { translateY: CANVAS_H / 2 },
    { scale },
    { translateX: -ORIGIN_X },
    { translateY: -ORIGIN_Y },
  ];
}

function layerIndex(
  which: 'back' | 'front',
  reduce: number,
  index: number,
  from: number,
  to: number,
): number {
  'worklet';
  if (reduce < 0.5) return index;
  const largerFirst = from >= to;
  if (which === 'back') return largerFirst ? from : to;
  return largerFirst ? to : from;
}

function layerOpacity(
  which: 'back' | 'front',
  reduce: number,
  from: number,
  to: number,
  u: number,
): number {
  'worklet';
  if (reduce < 0.5) return which === 'back' ? 1 : 0;
  const previous = 1 - u * u * u;
  const next = 1 - (1 - u) * (1 - u) * (1 - u);
  const fromIsLarger = from >= to;
  if (which === 'back') return fromIsLarger ? previous : next;
  return fromIsLarger ? next : previous;
}

type GlyphProps = {
  width: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
};

/** Same silhouette as the hero stone, for the row of choices. */
export function KlumpenGlyph({ width, fill = 'none', stroke, strokeWidth = 0 }: GlyphProps) {
  const height = width * KLUMP_ASPECT;
  const box = KLUMPEN_BOUNDS;
  return (
    <Svg width={width} height={height} viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}>
      <SvgPath
        d={KLUMPEN_PATH}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth > 0 ? strokeWidth * (box.width / width) : 0}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

type BodyProps = {
  index: SharedValue<number>;
  minutes: number;
  reduce: SharedValue<number>;
  reduceMotion: boolean;
  fade: Fade;
  /** Faint 20-minute contour behind the stone. The sheet uses it; Hjem does not. */
  ghost?: boolean;
};

/** The matte stone, its number, and the size animation. Layout box is the 20-minute size, so the center stays put. */
export function KlumpenBody({ index, minutes, reduce, reduceMotion, fade, ghost = false }: BodyProps) {
  const { theme } = useTheme();
  const { fontScale } = useWindowDimensions();
  const type = durationType(fontScale);
  const path = useMemo(() => Skia.Path.MakeFromSVGString(KLUMPEN_PATH), []);
  // Tabular hero number. System F is Figtree Light with tabular-nums.
  const hero = theme.text.monoHero;
  const fontSize = (Number(hero.fontSize) || 56) * type.numberScale;
  const rim = theme.name === 'dark';

  const backTransform = useDerivedValue(() =>
    stoneTransform(layerIndex('back', reduce.value, index.value, fade.from.value, fade.to.value)),
  );
  const frontTransform = useDerivedValue(() =>
    stoneTransform(layerIndex('front', reduce.value, index.value, fade.from.value, fade.to.value)),
  );
  const backOpacity = useDerivedValue(() =>
    layerOpacity('back', reduce.value, fade.from.value, fade.to.value, fade.u.value),
  );
  const frontOpacity = useDerivedValue(() =>
    layerOpacity('front', reduce.value, fade.from.value, fade.to.value, fade.u.value),
  );
  const ghostTransform = useDerivedValue(() => stoneTransform(3));

  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.stage}
    >
      {path ? (
        <Canvas style={styles.canvas} pointerEvents="none">
          {ghost ? (
            <Group transform={ghostTransform}>
              <Path path={path} style="stroke" strokeWidth={OUTLINE_STROKE} color={OUTLINE} />
            </Group>
          ) : null}
          <StoneLayer path={path} transform={backTransform} opacity={backOpacity} rim={rim} />
          <StoneLayer path={path} transform={frontTransform} opacity={frontOpacity} rim={rim} />
        </Canvas>
      ) : (
        <View style={styles.fallback} />
      )}
      <View pointerEvents="none" style={styles.face}>
        <RollingNumber
          value={minutes}
          color={STONE_NUMBER_COLOR}
          fontSize={fontSize}
          fontFamily={hero.fontFamily}
          fontVariant={hero.fontVariant}
          reduceMotion={reduceMotion}
        />
        {type.hideUnit ? null : (
          <Text allowFontScaling={false} style={[styles.unit, { fontFamily: theme.fonts.sansMedium }]}>
            {DURATION_UNIT}
          </Text>
        )}
      </View>
    </View>
  );
}

const OUTLINE = '#CFC9BF';
const OUTLINE_STROKE = KLUMPEN_BOUNDS.width / MAX_W;

function StoneLayer({
  path,
  transform,
  opacity,
  rim,
}: {
  path: NonNullable<ReturnType<typeof Skia.Path.MakeFromSVGString>>;
  transform: SharedValue<Transforms3d>;
  opacity: SharedValue<number>;
  rim: boolean;
}) {
  return (
    <Group transform={transform} opacity={opacity}>
      <Group transform={[{ translateY: 58 }]} opacity={0.55}>
        <Path path={path} color="rgba(60,50,40,1)">
          <Blur blur={70} />
        </Path>
      </Group>
      <Path path={path}>
        <LinearGradient
          start={vec(ORIGIN_X, KLUMPEN_BOUNDS.y)}
          end={vec(ORIGIN_X, KLUMPEN_BOUNDS.y + KLUMPEN_BOUNDS.height)}
          colors={['#32312F', '#141413', '#0A0A09']}
        />
      </Path>
      {rim ? <Path path={path} style="stroke" strokeWidth={6} color="rgba(255,255,255,0.22)" /> : null}
    </Group>
  );
}

function RollingNumber({
  value,
  color,
  fontSize,
  fontFamily,
  fontVariant,
  reduceMotion,
}: {
  value: number;
  color: string;
  fontSize: number;
  fontFamily: string | undefined;
  fontVariant: TextStyle['fontVariant'];
  reduceMotion: boolean;
}) {
  const [phase, setPhase] = useState({ from: value, to: value, gen: 0 });
  if (value !== phase.to) {
    setPhase({ from: phase.to, to: value, gen: phase.gen + 1 });
  }
  const travel = rollTravel(phase.from, phase.to);
  const text: TextStyle = {
    fontFamily,
    fontSize,
    lineHeight: fontSize,
    color,
    fontVariant,
    textAlign: 'center',
    includeFontPadding: false,
  };
  return (
    <View style={{ height: fontSize, minWidth: fontSize * 1.7, overflow: 'hidden', alignItems: 'center' }}>
      <Roll key={phase.gen} from={phase.from} to={phase.to} travel={travel} reduceMotion={reduceMotion} text={text} />
    </View>
  );
}

function Roll({
  from,
  to,
  travel,
  reduceMotion,
  text,
}: {
  from: number;
  to: number;
  travel: -1 | 0 | 1;
  reduceMotion: boolean;
  text: TextStyle;
}) {
  const outY = useSharedValue(0);
  const outO = useSharedValue(1);
  const inY = useSharedValue(travel === 0 || reduceMotion ? 0 : -travel * ROLL_DISTANCE);
  const inO = useSharedValue(travel === 0 ? 1 : 0);

  useEffect(() => {
    if (travel === 0) return;
    if (reduceMotion) {
      outO.value = withTiming(0, { duration: CROSSFADE_MS, easing: Easing.inOut(Easing.sin) });
      inO.value = withTiming(1, { duration: CROSSFADE_MS, easing: Easing.inOut(Easing.sin) });
      return;
    }
    const easeIn = Easing.in(Easing.cubic);
    const easeOut = Easing.out(Easing.cubic);
    outY.value = withTiming(travel * ROLL_DISTANCE, { duration: ROLL_OUT_MS, easing: easeIn });
    outO.value = withTiming(0, { duration: ROLL_OUT_MS, easing: easeIn });
    inY.value = withDelay(ROLL_IN_DELAY, withTiming(0, { duration: ROLL_IN_MS, easing: easeOut }));
    inO.value = withDelay(ROLL_IN_DELAY, withTiming(1, { duration: ROLL_IN_MS, easing: easeOut }));
  }, [inO, inY, outO, outY, reduceMotion, travel]);

  const outStyle = useAnimatedStyle(() => ({
    opacity: outO.value,
    transform: [{ translateY: outY.value }],
  }));
  const inStyle = useAnimatedStyle(() => ({
    opacity: inO.value,
    transform: [{ translateY: inY.value }],
  }));

  if (travel === 0) {
    return (
      <Text allowFontScaling={false} style={text}>
        {to}
      </Text>
    );
  }
  return (
    <>
      <Animated.Text allowFontScaling={false} style={[text, outStyle]}>
        {from}
      </Animated.Text>
      <Animated.Text allowFontScaling={false} style={[text, styles.incoming, inStyle]}>
        {to}
      </Animated.Text>
    </>
  );
}

function useDelayedValue<T>(value: T, delay: number): T {
  const [shown, setShown] = useState(value);
  const seen = useRef(value);
  useEffect(() => {
    if (Object.is(seen.current, value)) return;
    const id = setTimeout(() => {
      seen.current = value;
      setShown(value);
    }, delay);
    return () => clearTimeout(id);
  }, [delay, value]);
  return shown;
}

/** Hjem’s stone. Same shape and size as the one in the sheet. The spring waits 120 ms so it reads behind the closing sheet. */
export function HomeKlumpen({
  minutes,
  onPress,
  focusRef,
}: {
  minutes: number;
  onPress: () => void;
  /** Focus returns here when the duration sheet closes. */
  focusRef?: RefObject<HostInstance | null>;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion() === true;
  const shown = useDelayedValue(minutes, HOME_APPLY_DELAY);
  const index = useSharedValue(minutesToIndex(minutes));
  const reduce = useSharedValue(reduceMotion ? 1 : 0);
  const fadeFrom = useSharedValue(minutesToIndex(minutes));
  const fadeTo = useSharedValue(minutesToIndex(minutes));
  const fadeU = useSharedValue(1);
  const fade = useRef({ from: fadeFrom, to: fadeTo, u: fadeU }).current;
  const ready = useRef(false);
  const reduceRef = useRef(reduceMotion);
  reduceRef.current = reduceMotion;
  const [heroHeight, setHeroHeight] = useState(0);

  useEffect(() => {
    reduce.value = reduceMotion ? 1 : 0;
  }, [reduce, reduceMotion]);

  useEffect(() => {
    const target = minutesToIndex(shown);
    if (!ready.current) {
      ready.current = true;
      index.value = target;
      fade.from.value = target;
      fade.to.value = target;
      fade.u.value = 1;
      return;
    }
    if (reduceRef.current) crossfadeTo(fade, target);
    else index.value = withSpring(target, SIZE_SPRING);
  }, [fade, index, shown]);

  const natural = HOME_STONE_CENTER_Y - insets.top - screenPadding;
  const maxCenter = heroHeight > 0 ? heroHeight - HINT_GAP - 22 - MAX_H / 2 : natural;
  const center = Math.min(natural, Math.max(maxCenter, MAX_H / 2));

  const hintStyle = useAnimatedStyle(() => {
    const idx = reduce.value > 0.5 ? fade.from.value + (fade.to.value - fade.from.value) * fade.u.value : index.value;
    const height = (KLUMP_WIDTH_MIN + KLUMP_WIDTH_STEP * idx) * KLUMP_ASPECT;
    return { top: center + height / 2 + HINT_GAP };
  });

  return (
    <View style={styles.hero} onLayout={(event) => setHeroHeight(event.nativeEvent.layout.height)}>
      <View style={[styles.homeSlot, { top: center - MAX_H / 2 }]}>
        <Pressable
          ref={focusRef}
          accessibilityRole="button"
          accessibilityLabel={homeKlumpenLabel(shown)}
          onPress={onPress}
        >
          <KlumpenBody index={index} minutes={shown} reduce={reduce} reduceMotion={reduceMotion} fade={fade} />
        </Pressable>
      </View>
      <Animated.Text
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={[theme.text.caption, styles.hint, { color: theme.color.text.secondary }, hintStyle]}
      >
        {DURATION_HOME_HINT}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { width: MAX_W, height: MAX_H, alignItems: 'center', justifyContent: 'center' },
  canvas: { position: 'absolute', width: CANVAS_W, height: CANVAS_H, left: -PAD, top: -PAD },
  fallback: {
    width: 160,
    height: 160 * KLUMP_ASPECT,
    borderRadius: 80,
    backgroundColor: STONE_COLOR,
  },
  face: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  unit: { marginTop: 2, fontSize: 13, lineHeight: 16, color: STONE_UNIT_COLOR },
  incoming: { position: 'absolute', left: 0, right: 0 },
  hero: { flex: 1 },
  homeSlot: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  hint: { position: 'absolute', left: 0, right: 0, textAlign: 'center' },
});
