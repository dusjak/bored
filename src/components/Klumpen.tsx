import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions, type HostInstance, type TextStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Path as SvgPath } from 'react-native-svg';
import {
  Blur,
  Canvas,
  Group,
  ImageShader,
  Path,
  Skia,
  usePathValue,
  type SkImage,
  type Transforms3d,
} from '@shopify/react-native-skia';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  runOnUI,
  useAnimatedReaction,
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
import { stonePath } from '@/onboarding/formShape';
import type { MaterialId } from '@/materials/pathLight';
import { FixedRim, MaterialShade, useLiveMaterial, type LiveFrame } from '@/materials/DynamicMaterial';
import { PinnedEngraving } from '@/materials/EngravedText';
import {
  ENGRAVED_NUMBER_TRACKING_EM,
  ENGRAVED_SHADOW,
  NUMBER_CENTER_FROM_CY,
  UNIT_CENTER_FROM_CY,
} from '@/materials/engraving';
import { useCachedStoneImage } from '@/session/stoneImage';
import {
  CROSSFADE_MS,
  DURATION_UNIT,
  HOME_APPLY_DELAY,
  HOME_STONE_CENTER_Y,
  KLUMP_ASPECT,
  KLUMP_WIDTH_MIN,
  HOME_UNIT_FONT_SIZE,
  HOME_UNIT_LINE_HEIGHT,
  NUMBER_UNIT_GAP,
  homeUnitMarginTop,
  glyphFrame,
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
  SWIPE_ACTIVATION,
  SWIPE_STEP,
  VERTICAL_YIELD,
  indexFromSwipe,
  indexVelocity,
  klumpHeight,
  klumpWidth,
  minutesToIndex,
  presetIndex,
  rollTravel,
  selectionFromIndex,
  SHEET_NUMBER_UNIT_GAP,
  snapIndex,
} from '@/duration/klumpen';
import { PRESET_MINUTES } from '@/data/copy';
import { screenPadding, useTheme } from '@/theme';

const PAD = 36;
const MAX_W = klumpWidth(3);
const MAX_H = klumpHeight(MAX_W);
const CANVAS_W = MAX_W + PAD * 2;
const CANVAS_H = MAX_H + PAD * 2;
const BOX_W = KLUMPEN_BOUNDS.width;
const ORIGIN_X = KLUMPEN_BOUNDS.x + BOX_W / 2;
const ORIGIN_Y = KLUMPEN_BOUNDS.y + KLUMPEN_BOUNDS.height / 2;
const HJEM_ARTBOARD = (BOX_W * 1200) / 720;
const HJEM_WINDOW = { x: ORIGIN_X - HJEM_ARTBOARD / 2, y: ORIGIN_Y - HJEM_ARTBOARD / 2, size: HJEM_ARTBOARD };
const HJEM_FRAME: LiveFrame = { kind: 'hjem', originX: ORIGIN_X, originY: ORIGIN_Y, boxW: BOX_W };

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
  /** Room kept for a centred stroke, even on the filled twin. */
  bleed?: number;
};

/** Same silhouette as the hero stone, for the row of choices. */
export function KlumpenGlyph({ width, fill = 'none', stroke, strokeWidth = 0, bleed = strokeWidth }: GlyphProps) {
  const box = KLUMPEN_BOUNDS;
  const frame = glyphFrame(width, bleed, box);
  return (
    <Svg width={frame.width} height={frame.height} viewBox={frame.viewBox}>
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
  /** Space under the number before «min». Hjem keeps the shared gap. */
  unitGap?: number;
  /** Upright Figtree for onboarding numbers. Hjem keeps Figtree Light. */
  numberFamily?: string;
  /** «min» on the stone. Hjem keeps the shared grey. */
  unitColor?: string;
  /** Saved surface. The duration sheet leaves this unset and stays gummi. */
  material?: MaterialId;
  /** Saved radial form in path units. Empty keeps the base silhouette. */
  formOffsets?: readonly number[] | null;
  /** Onboarding keeps the four still Gummi pictures. Hjem leaves this off. */
  rasterOnly?: boolean;
  /** Replaces the minute numeral. The session clock uses this and hides «min». */
  label?: string;
  digits?: boolean;
};

/** The matte stone, its number, and the size animation. Layout box is the 20-minute size, so the center stays put. */
export function KlumpenBody({
  index,
  minutes,
  reduce,
  reduceMotion,
  fade,
  ghost = false,
  unitGap = NUMBER_UNIT_GAP,
  numberFamily,
  unitColor,
  material = 'gummi',
  formOffsets = null,
  rasterOnly = false,
  label,
  digits = true,
}: BodyProps) {
  const { theme } = useTheme();
  const { fontScale } = useWindowDimensions();
  const type = durationType(fontScale);
  const deformed = !!formOffsets?.some((value) => Math.abs(value) > 0.05);
  const path = useMemo(
    () => Skia.Path.MakeFromSVGString(!rasterOnly && deformed && formOffsets ? stonePath(formOffsets) : KLUMPEN_PATH),
    [deformed, formOffsets, rasterOnly],
  );
  const gummi120 = useCachedStoneImage(require('../../assets/hjem/klumpen-gummi-120pt.png'));
  const gummi160 = useCachedStoneImage(require('../../assets/hjem/klumpen-gummi-160pt.png'));
  const gummi200 = useCachedStoneImage(require('../../assets/hjem/klumpen-gummi-200pt.png'));
  const gummi240 = useCachedStoneImage(require('../../assets/hjem/klumpen-gummi-240pt.png'));
  const gummi = [gummi120, gummi160, gummi200, gummi240];
  const [band, setBand] = useState(() => Math.max(0, Math.min(3, Math.ceil(index.value - 1e-3))));
  useAnimatedReaction(
    () => Math.max(0, Math.min(3, Math.ceil(index.value - 1e-3))),
    (next, prev) => {
      if (next !== prev) runOnJS(setBand)(next);
    },
  );
  const gummiImage = gummi[band] ?? null;
  const widthPt = KLUMP_WIDTH_MIN + KLUMP_WIDTH_STEP * band;
  const field = useLiveMaterial(material, null, HJEM_WINDOW, widthPt * (1200 / 720), false, HJEM_FRAME, 'hjem', undefined, false);
  const raster = gummiImage;
  const blank = useMemo(() => Skia.Path.Make(), []);
  const svg = path ?? blank;
  const backPoint = usePathValue((builder) => {
    'worklet';
    const idx = layerIndex('back', reduce.value, index.value, fade.from.value, fade.to.value);
    const s = (KLUMP_WIDTH_MIN + KLUMP_WIDTH_STEP * idx) / BOX_W;
    builder.transform([s, 0, CANVAS_W / 2 - ORIGIN_X * s, 0, s, CANVAS_H / 2 - ORIGIN_Y * s, 0, 0, 1]);
  }, svg);
  const frontPoint = usePathValue((builder) => {
    'worklet';
    const idx = layerIndex('front', reduce.value, index.value, fade.from.value, fade.to.value);
    const s = (KLUMP_WIDTH_MIN + KLUMP_WIDTH_STEP * idx) / BOX_W;
    builder.transform([s, 0, CANVAS_W / 2 - ORIGIN_X * s, 0, s, CANVAS_H / 2 - ORIGIN_Y * s, 0, 0, 1]);
  }, svg);
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
          <StoneLayer path={path} pointPath={backPoint} transform={backTransform} opacity={backOpacity} rim={rim} image={raster} field={field} material={material} />
          <StoneLayer path={path} pointPath={frontPoint} transform={frontTransform} opacity={frontOpacity} rim={rim} image={raster} field={field} material={material} />
        </Canvas>
      ) : (
        <View style={styles.fallback} />
      )}
      {digits ? (
        <View pointerEvents="none" style={styles.face}>
          <PinnedEngraving
            text={label ?? String(minutes)}
            fontSize={label ? Math.min(fontSize, Math.round(klumpWidth(minutesToIndex(minutes)) * 0.28)) : fontSize}
            centerY={label ? 0 : NUMBER_CENTER_FROM_CY}
            trackingEm={ENGRAVED_NUMBER_TRACKING_EM}
          />
          {type.hideUnit || label ? null : (
            <PinnedEngraving
              text={DURATION_UNIT}
              fontSize={HOME_UNIT_FONT_SIZE}
              centerY={UNIT_CENTER_FROM_CY}
              trackingEm={0}
            />
          )}
        </View>
      ) : null}
    </View>
  );
}

const OUTLINE = '#CFC9BF';
const OUTLINE_STROKE = KLUMPEN_BOUNDS.width / MAX_W;

function StoneLayer({
  path,
  pointPath,
  transform,
  opacity,
  rim,
  image,
  field,
  material,
}: {
  path: NonNullable<ReturnType<typeof Skia.Path.MakeFromSVGString>>;
  pointPath: ReturnType<typeof usePathValue>;
  transform: SharedValue<Transforms3d>;
  opacity: SharedValue<number>;
  rim: boolean;
  image: SkImage | null;
  field: ReturnType<typeof useLiveMaterial>;
  material: MaterialId;
}) {
  const live = field.ready && field.rimFilter;
  return (
    <Group opacity={opacity}>
      <Group transform={transform}>
        <Group transform={[{ translateY: 58 }]} opacity={0.55}>
          <Path path={path} color="rgba(60,50,40,1)">
            <Blur blur={70} />
          </Path>
        </Group>
        <Path path={path} color={STONE_COLOR}>
          {live ? (
            <MaterialShade material={material} field={field} rect={HJEM_WINDOW} />
          ) : image ? (
            <ImageShader
              image={image}
              fit="fill"
              x={KLUMPEN_BOUNDS.x}
              y={KLUMPEN_BOUNDS.y}
              width={KLUMPEN_BOUNDS.width}
              height={KLUMPEN_BOUNDS.height}
            />
          ) : null}
        </Path>
        {live || !rim ? null : <Path path={path} style="stroke" strokeWidth={6} color="rgba(255,255,255,0.22)" />}
      </Group>
      {live && field.rimFilter ? <FixedRim path={pointPath} filter={field.rimFilter} /> : null}
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
    ...ENGRAVED_SHADOW,
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
  onChange,
  focusRef,
  material = 'gummi',
  formOffsets = null,
}: {
  minutes: number;
  onPress: () => void;
  /** Swipe commits 5 / 10 / 15 / 20 directly. Same step as the sheet. */
  onChange: (minutes: number) => void;
  /** Focus returns here when the duration sheet closes. */
  focusRef?: RefObject<HostInstance | null>;
  material?: MaterialId;
  formOffsets?: readonly number[] | null;
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
  const dragging = useRef(false);
  const minutesRef = useRef(minutes);
  minutesRef.current = minutes;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [display, setDisplay] = useState(minutes);
  const [heroHeight, setHeroHeight] = useState(0);
  const axis = useRef<'x' | null>(null);
  const startIndex = useRef(presetIndex(minutes));

  const showStop = (next: number) => {
    const picked = PRESET_MINUTES[next] ?? PRESET_MINUTES[1];
    setDisplay((current) => {
      if (current !== picked) void Haptics.selectionAsync();
      return picked;
    });
  };
  const api = useRef({ showStop });
  api.current.showStop = showStop;

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > SWIPE_ACTIVATION && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        axis.current = 'x';
        dragging.current = true;
        startIndex.current = presetIndex(minutesRef.current);
        cancelAnimation(index);
      },
      onPanResponderMove: (_, gesture) => {
        if (axis.current !== 'x') return;
        if (Math.abs(gesture.dy) > VERTICAL_YIELD && Math.abs(gesture.dy) > Math.abs(gesture.dx)) return;
        if (reduceRef.current) {
          api.current.showStop(selectionFromIndex(startIndex.current + gesture.dx / SWIPE_STEP));
          return;
        }
        const next = indexFromSwipe(startIndex.current, gesture.dx);
        index.value = next;
        api.current.showStop(selectionFromIndex(next));
      },
      onPanResponderRelease: (_, gesture) => {
        const raw = indexFromSwipe(startIndex.current, gesture.dx);
        const snapped = snapIndex(raw, gesture.vx);
        const picked = PRESET_MINUTES[snapped] ?? PRESET_MINUTES[1];
        setDisplay(picked);
        if (reduceRef.current) crossfadeTo(fade, snapped);
        else {
          index.value = withSpring(snapped, {
            mass: SIZE_SPRING.mass,
            stiffness: SIZE_SPRING.stiffness,
            damping: SIZE_SPRING.damping,
            velocity: indexVelocity(gesture.vx),
          });
        }
        dragging.current = false;
        axis.current = null;
        onChangeRef.current(picked);
      },
      onPanResponderTerminate: () => {
        dragging.current = false;
        axis.current = null;
      },
    }),
  ).current;

  useEffect(() => {
    reduce.value = reduceMotion ? 1 : 0;
  }, [reduce, reduceMotion]);

  useEffect(() => {
    if (!dragging.current) setDisplay(shown);
  }, [shown]);

  useEffect(() => {
    if (dragging.current) return;
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
  const maxCenter = heroHeight > 0 ? heroHeight - MAX_H / 2 : natural;
  const center = Math.min(natural, Math.max(maxCenter, MAX_H / 2));

  return (
    <View style={styles.hero} onLayout={(event) => setHeroHeight(event.nativeEvent.layout.height)}>
      <View style={[styles.homeSlot, { top: center - MAX_H / 2 }]} {...pan.panHandlers}>
        <Pressable
          ref={focusRef}
          accessibilityRole="button"
          accessibilityLabel={homeKlumpenLabel(display)}
          accessibilityActions={[
            { name: 'increment', label: 'Øk' },
            { name: 'decrement', label: 'Senk' },
          ]}
          onAccessibilityAction={(event) => {
            const dir = event.nativeEvent.actionName === 'increment' ? 1 : -1;
            const next = Math.max(0, Math.min(PRESET_MINUTES.length - 1, presetIndex(minutesRef.current) + dir));
            const picked = PRESET_MINUTES[next] ?? PRESET_MINUTES[1];
            onChangeRef.current(picked);
          }}
          onPress={onPress}
        >
          <KlumpenBody
            index={index}
            minutes={display}
            reduce={reduce}
            reduceMotion={reduceMotion}
            fade={fade}
            ghost
            rasterOnly
            unitGap={NUMBER_UNIT_GAP}
            numberFamily={theme.fonts.sans}
            unitColor={STONE_NUMBER_COLOR}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { width: MAX_W, height: MAX_H, alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  canvas: { position: 'absolute', width: CANVAS_W, height: CANVAS_H, left: -PAD, top: -PAD },
  fallback: {
    width: 160,
    height: 160 * KLUMP_ASPECT,
    borderRadius: 80,
    backgroundColor: STONE_COLOR,
  },
  face: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  unit: { marginTop: NUMBER_UNIT_GAP, fontSize: 13, lineHeight: 16, color: STONE_UNIT_COLOR },
  incoming: { position: 'absolute', left: 0, right: 0 },
  hero: { flex: 1 },
  homeSlot: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
});
