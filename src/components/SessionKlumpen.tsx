import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import {
  AccessibilityInfo,
  Animated,
  AppState,
  Platform,
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type ViewInstance,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  BlurMask,
  Canvas,
  ImageShader,
  Path,
  Skia,
  SweepGradient,
  select,
  useImage,
  usePathValue,
  vec,
} from '@shopify/react-native-skia';
import Reanimated, {
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { MaterialShade, useLiveMaterial } from '@/materials/DynamicMaterial';
import { materialPlacement } from '@/materials/restMaps';
import {
  KLUMPEN_BOUNDS,
  sessionStoneScale,
  sessionStoneWidth,
  sessionTextureRect,
  writeKlumpenPath,
} from '@/session/klumpenShape';
import { SESSION_HINT_BOX, sessionCanvasBox, sessionKlumpenMargins } from '@/session/sessionLayout';
import {
  HOLD,
  HOLD_TO_END_MS,
  REST_SPRING,
  RING_OFFSET,
  contourGradient,
  glowLevel,
  holdMsAt,
  isHeld,
  mixHex,
  phaseIndex,
  sampleHold,
  springTargets,
  stepSpring,
  type HoldGesture,
  type HoldSample,
  type SpringState,
} from '@/session/holdToEnd';
import { HOLD_A11Y_LABEL, HOLD_DONE_TEXT, HOLD_PHASE_TEXT } from '@/data/copy';
import { drawProgress, strokeOpacity } from '@/session/trackStroke';
import { useTheme } from '@/theme';

/**
 * Glow sigma is in the same point space as the path. respectCTM keeps it
 * that way when the canvas is scaled to the screen.
 */
const BLUR_RESPECTS_POINTS = true;

/** Skia’s sweep 0 is east. Rotating about the centroid puts 0 at north, clockwise. */
const SWEEP_NORTH = -Math.PI / 2;

const REST_SRC = require('../../assets/okt/klumpen-okt-hvile.png');
const PRESSED_SRC = require('../../assets/okt/klumpen-okt-trykket.png');

/**
 * Canvas fits the 240 pt stone plus the ring and the peak glow.
 * The outline is drawn around its centroid, which sits at the canvas centre.
 * Copied out of the layout module so the worklet closes over plain numbers.
 */
const CANVAS = sessionCanvasBox();
const CANVAS_W = CANVAS.width;
const CANVAS_H = CANVAS.height;
const CX = CANVAS.cx;
const CY = CANVAS.cy;

const LINES = [...HOLD_PHASE_TEXT, HOLD_DONE_TEXT] as const;

type Pose = HoldSample & {
  sq: number;
  wob: number;
  size: number;
  phase: number;
  /** Grey track and lit arc. 0 at rest. */
  track: number;
  /** Arc fill after the 150 ms fade. Frozen on release, so it does not rewind. */
  drawProg: number;
};

type Palette = {
  core: string;
  amber: string;
  track: string;
  solid: string;
  highlight: string;
  rubber: string;
  done: string;
};

type Props = {
  /** Chosen length. The stone is 120 / 160 / 200 / 240 pt for 5 / 10 / 15 / 20 minutes. */
  minutes: number;
  enabled: boolean;
  showHint: boolean;
  fade: SharedValue<number>;
  morph?: Animated.Value;
  accessibilityLabel: string;
  accessibilityHint?: string;
  accessibilityAction?: boolean;
  onComplete: () => void;
  onSettled: () => void;
  /** Finger down. The lock hint must hide. */
  onHoldStart?: () => void;
  /** Early release. The lock hint stays hidden through the exit. */
  onHoldCancel?: () => void;
  onAccessibilityEnd: () => void;
  /**
   * Space from the previous sibling to the outer edge of the track stroke.
   * 0 when the timer is hidden, so the ring and the hint centre as a pair.
   */
  gapAbove: number;
  /** Window Y of the hold caption. The lock hint uses it at large type. */
  hintAnchorRef?: RefObject<ViewInstance | null>;
  onHintLayout?: () => void;
  children?: ReactNode;
};

function gestureOf(press: number, release: number, done: number): HoldGesture {
  'worklet';
  return {
    pressAt: press < 0 ? null : press,
    releaseAt: release < 0 ? null : release,
    doneAt: done < 0 ? null : done,
  };
}

/**
 * Session Klumpen with the variant-A hold.
 * The arc, glow and rubber spring run on the UI thread. Releasing early
 * drops the light in 300 ms and lets the shape spring back. No failure haptic.
 *
 * expo-haptics 58 has no intensity argument, so touch is Soft, the phase
 * changes are Light, and finishing is Success. That is the same order as the spec.
 */
export function SessionKlumpen({
  minutes,
  enabled,
  showHint,
  fade,
  morph,
  accessibilityLabel,
  accessibilityHint,
  accessibilityAction,
  onComplete,
  onSettled,
  onHoldStart,
  onHoldCancel,
  onAccessibilityEnd,
  gapAbove,
  hintAnchorRef,
  onHintLayout,
  children,
}: Props) {
  const { theme } = useTheme();
  const [screenReader, setScreenReader] = useState(false);
  const reader = useRef(false);
  reader.current = screenReader;

  const pressAt = useSharedValue(-1);
  const releaseAt = useSharedValue(-1);
  const doneAt = useSharedValue(-1);
  const locked = useSharedValue(0);
  const enabledSv = useSharedValue(enabled ? 1 : 0);
  const reduceSv = useSharedValue(0);
  const solidSv = useSharedValue(0);
  const phaseSent = useSharedValue(0);
  const completeSent = useSharedValue(0);
  const settleSent = useSharedValue(0);
  const lastNow = useSharedValue(0);
  const fillMix = useSharedValue(0);
  const spring = useSharedValue<SpringState>({ ...REST_SPRING });
  const palette = useSharedValue<Palette>({
    core: theme.color.glow.core,
    amber: theme.color.glow.amber,
    track: theme.color.session['ring-track'],
    solid: theme.color.glow.solid,
    highlight: theme.color.glow.highlight,
    rubber: theme.color.session.object,
    done: theme.color.object.fill,
  });
  const pose = useSharedValue<Pose>({
    ...sampleHold({ pressAt: null, releaseAt: null, doneAt: null }, 0, { reduceMotion: false, solid: false }),
    sq: 0,
    wob: 0,
    size: 0,
    phase: 0,
    track: 0,
    drawProg: 0,
  });

  useEffect(() => {
    palette.value = {
      core: theme.color.glow.core,
      amber: theme.color.glow.amber,
      track: theme.color.session['ring-track'],
      solid: theme.color.glow.solid,
      highlight: theme.color.glow.highlight,
      rubber: theme.color.session.object,
      done: theme.color.object.fill,
    };
  }, [palette, theme]);

  useEffect(() => {
    enabledSv.value = enabled ? 1 : 0;
  }, [enabled, enabledSv]);

  useEffect(() => {
    if (!morph) return;
    const id = morph.addListener(({ value }) => {
      fillMix.value = value;
    });
    return () => morph.removeListener(id);
  }, [fillMix, morph]);

  useEffect(() => {
    const reduce = (on: boolean) => {
      reduceSv.value = on ? 1 : 0;
    };
    const solid = { contrast: false, transparency: false };
    const publishSolid = () => {
      solidSv.value = solid.contrast || solid.transparency ? 1 : 0;
    };
    AccessibilityInfo.isReduceMotionEnabled().then(reduce).catch(() => undefined);
    AccessibilityInfo.isScreenReaderEnabled().then(setScreenReader).catch(() => undefined);
    if (Platform.OS === 'ios') {
      AccessibilityInfo.isDarkerSystemColorsEnabled().then((on) => {
        solid.contrast = on;
        publishSolid();
      }).catch(() => undefined);
      AccessibilityInfo.isReduceTransparencyEnabled().then((on) => {
        solid.transparency = on;
        publishSolid();
      }).catch(() => undefined);
    }
    const subs = [
      AccessibilityInfo.addEventListener('reduceMotionChanged', reduce),
      AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReader),
    ];
    if (Platform.OS === 'ios') {
      subs.push(
        AccessibilityInfo.addEventListener('darkerSystemColorsChanged', (on) => {
          solid.contrast = on;
          publishSolid();
        }),
        AccessibilityInfo.addEventListener('reduceTransparencyChanged', (on) => {
          solid.transparency = on;
          publishSolid();
        }),
      );
    }
    return () => {
      for (const sub of subs) sub.remove();
    };
  }, [reduceSv, solidSv]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') return;
      if (locked.value === 1 || doneAt.value >= 0) return;
      if (pressAt.value < 0 || releaseAt.value >= 0) return;
      releaseAt.value = Date.now();
    });
    return () => sub.remove();
  }, [doneAt, locked, pressAt, releaseAt]);

  const fireTouch = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => undefined);
  }, []);
  const firePhase = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  }, []);
  const fireSuccess = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  }, []);
  const fireComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);
  const fireSettled = useCallback(() => {
    onSettled();
  }, [onSettled]);
  const [deform, setDeform] = useState({ sq: 0, wob: 0, size: 0, phase: 0 });
  const publishDeform = useCallback((next: { sq: number; wob: number; size: number; phase: number }) => {
    setDeform(next);
  }, []);
  const deformKey = useSharedValue('rest');
  const deformAt = useSharedValue(0);

  const onFrame = useCallback(
    (frame: { timeSincePreviousFrame: number | null }) => {
      'worklet';
      const now = Date.now();
      const prev = lastNow.value;
      if (prev > 0 && now - prev > 200 && pressAt.value >= 0 && doneAt.value < 0 && releaseAt.value < 0) {
        releaseAt.value = prev;
      }
      lastNow.value = now;
      if (enabledSv.value === 0 && pressAt.value >= 0 && doneAt.value < 0 && releaseAt.value < 0) {
        releaseAt.value = now;
      }

      const press = pressAt.value;
      const release = releaseAt.value;
      if (press >= 0 && doneAt.value < 0 && release < 0 && now - press >= HOLD_TO_END_MS) {
        doneAt.value = press + HOLD_TO_END_MS;
        locked.value = 1;
        if (completeSent.value === 0) {
          completeSent.value = 1;
          runOnJS(fireSuccess)();
          runOnJS(fireComplete)();
        }
      }

      const g = gestureOf(pressAt.value, releaseAt.value, doneAt.value);
      if (isHeld(g, now)) {
        const phase = phaseIndex(holdMsAt(g, now));
        while (phaseSent.value < phase) {
          phaseSent.value += 1;
          if (phaseSent.value === 1 || phaseSent.value === 2) runOnJS(firePhase)();
        }
      }

      const holding = isHeld(g, now);
      const releasedRecently = g.releaseAt != null && now - g.releaseAt < 1000;
      const confirming = g.doneAt != null && now - g.doneAt < HOLD.doneFadeAtMs + HOLD.doneFadeMs + 50;
      const moving =
        Math.abs(spring.value.sq) > 0.0004 ||
        Math.abs(spring.value.sqV) > 0.0004 ||
        Math.abs(spring.value.wob) > 0.0004 ||
        Math.abs(spring.value.wobV) > 0.0004 ||
        Math.abs(spring.value.size) > 0.0004 ||
        Math.abs(spring.value.sizeV) > 0.0004;
      if (!holding && !releasedRecently && !confirming && !moving) {
        if (deformKey.value !== 'rest') {
          deformKey.value = 'rest';
          deformAt.value = now;
          runOnJS(publishDeform)({ sq: 0, wob: 0, size: 0, phase: 0 });
        }
        return;
      }

      const reduce = reduceSv.value === 1;
      const h = holdMsAt(g, now);
      const target = holding && !reduce ? springTargets(h, glowLevel(h)) : { sq: 0, wob: 0, size: 0 };
      const dt = (frame.timeSincePreviousFrame ?? 16) / 1000;
      const next = reduce ? { ...REST_SPRING } : stepSpring(spring.value, target, dt);
      spring.value = next;
      const sample = sampleHold(g, now, { reduceMotion: reduce, solid: solidSv.value === 1 });
      const spin = ((now % HOLD.wobbleRotMs) / HOLD.wobbleRotMs) * Math.PI * 2;
      pose.value = {
        ...sample,
        sq: next.sq,
        wob: next.wob,
        size: next.size,
        phase: spin,
        track: strokeOpacity(press >= 0, sample.holdMs, now, release, doneAt.value, reduce),
        drawProg: drawProgress(sample.holdMs),
      };
      fade.value = sample.fade;
      const poseKey = `${Math.round(next.sq * 256)}|${Math.round(next.wob * 256)}|${Math.round(next.size * 256)}|${
        Math.abs(next.wob) > 0.004 ? Math.round(spin * 2) : 0
      }`;
      const settledKey = poseKey === '0|0|0|0' ? 'rest' : poseKey;
      if (settledKey !== deformKey.value && (settledKey === 'rest' || now - deformAt.value >= 90)) {
        deformKey.value = settledKey;
        deformAt.value = now;
        runOnJS(publishDeform)(
          settledKey === 'rest'
            ? { sq: 0, wob: 0, size: 0, phase: 0 }
            : { sq: next.sq, wob: next.wob, size: next.size, phase: Math.abs(next.wob) > 0.004 ? spin : 0 },
        );
      }
      if (g.doneAt != null && settleSent.value === 0 && now >= g.doneAt + HOLD.doneFadeAtMs + HOLD.doneFadeMs) {
        settleSent.value = 1;
        runOnJS(fireSettled)();
      }
    },
    [
      completeSent,
      doneAt,
      enabledSv,
      fade,
      fireComplete,
      firePhase,
      fireSettled,
      fireSuccess,
      deformAt,
      deformKey,
      lastNow,
      locked,
      phaseSent,
      pose,
      pressAt,
      reduceSv,
      releaseAt,
      settleSent,
      solidSv,
      spring,
      publishDeform,
    ],
  );
  useFrameCallback(onFrame);

  const scale = sessionStoneScale(minutes);
  const margins = sessionKlumpenMargins(minutes, CY, gapAbove);
  const texture = sessionTextureRect(CX, CY, scale);
  const restImage = useImage(REST_SRC);
  const pressedImage = useImage(PRESSED_SRC);
  const fillPath = usePathValue((builder) => {
    'worklet';
    const p = pose.value;
    writeKlumpenPath(builder, CX, CY, p.sq, p.wob, p.size, p.phase, 0, scale);
  });
  const ringPath = usePathValue((builder) => {
    'worklet';
    const p = pose.value;
    writeKlumpenPath(builder, CX, CY, p.sq, p.wob, p.size, p.phase, RING_OFFSET, scale);
  });

  const restOpacity = useDerivedValue(() => 1 - fillMix.value);
  const pressedOpacity = useDerivedValue(() => pose.value.pressed * (1 - fillMix.value));
  const litGrad = useDerivedValue(() => {
    const p = pose.value;
    const pal = palette.value;
    const color = p.solid ? pal.solid : mixHex(pal.track, pal.core, p.litMix);
    const lit = p.drawProg > 0.001 ? 1 : 0;
    return contourGradient(p.drawProg, color, lit, true);
  });
  const glowGrad = useDerivedValue(() => {
    const p = pose.value;
    return contourGradient(p.drawProg, palette.value.amber, p.glowAlpha, true);
  });
  const highlightGrad = useDerivedValue(() => {
    const p = pose.value;
    return contourGradient(p.drawProg, palette.value.highlight, p.solid ? 0 : p.en, true);
  });
  const litWidth = useDerivedValue(() => pose.value.strokeW);
  const glowWidth = useDerivedValue(() => pose.value.strokeW * HOLD.glowGain);
  const trackOpacitySv = useDerivedValue(() => pose.value.track);
  const glowBlur = useDerivedValue(() => (pose.value.glowR < 0.5 ? 0.5 : pose.value.glowR));
  const stoneWidth = sessionStoneWidth(minutes);
  const place = useMemo(() => materialPlacement(stoneWidth, CX, CY), [stoneWidth]);
  const shadePath = useMemo(() => {
    const builder = Skia.PathBuilder.Make();
    writeKlumpenPath(builder, CX, CY, deform.sq, deform.wob, deform.size, deform.phase, 0, scale);
    return builder.build();
  }, [deform.phase, deform.size, deform.sq, deform.wob, scale]);
  const field = useLiveMaterial(
    'gummi',
    shadePath,
    { x: place.tx, y: place.ty, size: place.artboardPt },
    place.artboardPt,
    deform.sq !== 0 || deform.wob !== 0 || deform.size !== 0,
    { kind: 'points', width: stoneWidth, cx: CX, cy: CY },
  );

  // The outline origin is the centroid. At 176 pt it sits about +0.7 / +2.4 pt
  // from the box centre, and that offset scales because the stone scales around it.
  const center = vec(CX, CY);

  const onPressIn = () => {
    if (reader.current || locked.value === 1 || doneAt.value >= 0 || enabledSv.value === 0) return;
    phaseSent.value = 0;
    completeSent.value = 0;
    settleSent.value = 0;
    doneAt.value = -1;
    releaseAt.value = -1;
    pressAt.value = Date.now();
    fireTouch();
    onHoldStart?.();
  };
  const onPressOut = () => {
    if (doneAt.value >= 0 || locked.value === 1) return;
    const press = pressAt.value;
    if (press < 0) return;
    const now = Date.now();
    if (now - press >= HOLD_TO_END_MS) return;
    releaseAt.value = now;
    onHoldCancel?.();
  };
  const onPress = () => {
    if (!reader.current) return;
    onAccessibilityEnd();
  };

  const hitStyle = {
    left: CX + KLUMPEN_BOUNDS.minX * scale,
    top: CY - KLUMPEN_BOUNDS.maxY * scale,
    width: KLUMPEN_BOUNDS.width * scale,
    height: KLUMPEN_BOUNDS.height * scale,
  };

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { marginTop: margins.marginTop }]}>
      {/* The Skia picture view stays in the hit path even with pointerEvents "none"
          on the canvas itself, and the column's negative margin lays that view over
          the stone. A parent that returns no hit keeps the picture out of the hold. */}
      <View pointerEvents="none" collapsable={false} style={styles.canvasBox}>
        <Canvas style={styles.canvas} pointerEvents="none">
          {field.ready ? (
            <Path path={fillPath} style="fill" opacity={restOpacity}>
              <MaterialShade
                material="gummi"
                field={field}
                rect={{ x: place.tx, y: place.ty, size: place.artboardPt }}
              />
            </Path>
          ) : restImage ? (
            <Path path={fillPath} style="fill" opacity={restOpacity}>
              <ImageShader
                image={restImage}
                fit="fill"
                x={texture.x}
                y={texture.y}
                width={texture.width}
                height={texture.height}
              />
            </Path>
          ) : (
            <Path path={fillPath} style="fill" color={theme.color.session.object} opacity={restOpacity} />
          )}
          {!field.ready && pressedImage ? (
            <Path path={fillPath} style="fill" opacity={pressedOpacity}>
              <ImageShader
                image={pressedImage}
                fit="fill"
                x={texture.x}
                y={texture.y}
                width={texture.width}
                height={texture.height}
              />
            </Path>
          ) : null}
          <Path path={fillPath} style="fill" color={theme.color.object.fill} opacity={fillMix} />
          <Path
            path={ringPath}
            style="stroke"
            strokeWidth={HOLD.trackW}
            strokeJoin="round"
            color={theme.color.session['ring-track']}
            opacity={trackOpacitySv}
          />
          <Path path={ringPath} style="stroke" strokeWidth={glowWidth} strokeJoin="round" opacity={trackOpacitySv}>
            <SweepGradient
              c={center}
              start={0}
              end={360}
              transform={[{ rotate: SWEEP_NORTH }]}
              origin={center}
              colors={select(glowGrad, 'colors')}
              positions={select(glowGrad, 'positions')}
            />
            <BlurMask blur={glowBlur} style="normal" respectCTM={BLUR_RESPECTS_POINTS} />
          </Path>
          <Path path={ringPath} style="stroke" strokeWidth={litWidth} strokeJoin="round" opacity={trackOpacitySv}>
            <SweepGradient
              c={center}
              start={0}
              end={360}
              transform={[{ rotate: SWEEP_NORTH }]}
              origin={center}
              colors={select(litGrad, 'colors')}
              positions={select(litGrad, 'positions')}
            />
          </Path>
          <Path path={ringPath} style="stroke" strokeWidth={HOLD.highlightW} strokeJoin="round" opacity={trackOpacitySv}>
            <SweepGradient
              c={center}
              start={0}
              end={360}
              transform={[{ rotate: SWEEP_NORTH }]}
              origin={center}
              colors={select(highlightGrad, 'colors')}
              positions={select(highlightGrad, 'positions')}
            />
          </Path>
        </Canvas>
        <View pointerEvents="none" style={styles.dotSlot}>
          {children}
        </View>
      </View>
      {showHint ? (
        <View
          ref={hintAnchorRef}
          onLayout={onHintLayout}
          pointerEvents="none"
          style={[styles.hint, { marginTop: margins.hintMarginTop }]}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          {LINES.map((line, index) => (
            <PhaseLine key={line} index={index} pose={pose} text={line} color={theme.color.session['text-tertiary']} type={theme.text.caption} />
          ))}
        </View>
      ) : (
        <View pointerEvents="none" style={[styles.hint, { marginTop: margins.hintMarginTop }]} />
      )}
      <View
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityActions={accessibilityAction ? [{ name: 'end', label: HOLD_A11Y_LABEL }] : undefined}
        onAccessibilityAction={(event: AccessibilityActionEvent) => {
          if (event.nativeEvent.actionName === 'end') onAccessibilityEnd();
        }}
        onAccessibilityTap={onPress}
        collapsable={false}
        hitSlop={HOLD.slackPt}
        onStartShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={onPressIn}
        onResponderRelease={onPressOut}
        onResponderTerminate={onPressOut}
        style={[styles.hit, hitStyle]}
      />
    </View>
  );
}

function PhaseLine({
  index,
  pose,
  text,
  color,
  type,
}: {
  index: number;
  pose: SharedValue<Pose>;
  text: string;
  color: string;
  type: object;
}) {
  const style = useAnimatedStyle(() => {
    const p = pose.value;
    let opacity = 0;
    if (p.textCur === index) opacity += p.textXf;
    if (p.textPrev === index && p.textPrev !== p.textCur) opacity += 1 - p.textXf;
    return { opacity };
  });
  return (
    <Reanimated.Text
      style={[type, styles.phase, { color }, style]}
      numberOfLines={1}
      adjustsFontSizeToFit
      accessible={false}
    >
      {text}
    </Reanimated.Text>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', alignSelf: 'stretch', zIndex: 1 },
  canvasBox: { width: CANVAS_W, height: CANVAS_H },
  canvas: { width: CANVAS_W, height: CANVAS_H },
  dotSlot: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  hit: { position: 'absolute', zIndex: 2 },
  hint: { height: SESSION_HINT_BOX, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  phase: { position: 'absolute', left: 0, right: 0, textAlign: 'center' },
});
