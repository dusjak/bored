import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  AppState,
  Dimensions,
  PixelRatio,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import * as Device from 'expo-device';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import {
  Blur,
  Canvas,
  Circle,
  Group,
  LinearGradient,
  Paint,
  Path,
  Rect,
  Skia,
  vec,
} from '@shopify/react-native-skia';

import { lockHintCopy, lockHintSpeech } from '@/data/copy';
import { hasNotificationPermission } from '@/data/notifications';
import {
  BULGE_CORE_ALPHA,
  BULGE_GLOW_ALPHA,
  BULGE_GLOW_RADIUS_PT,
  BULGE_MATTE_ALPHA,
  BULGE_RIM_ALPHA,
  BULGE_RIM_SIGMA_PT,
  bulgeDepth,
  LOCK_HINT_DELAY_MS,
  LOCK_HINT_OVERLAY,
  LOCK_HINT_OVERLAY_CONTRAST,
  LOCK_HINT_OVERLAY_LEFT,
  LOCK_HINT_OVERLAY_RIGHT,
  LOCK_HINT_TEXT_RIGHT_PT,
  lockHintSettled,
  lockHintState,
  remainingLabelOpacity,
  type LockHintFrame,
} from '@/session/lockHintState';
import { isFullscreenWindow, lockHintOffer } from '@/session/lockHintVisibility';
import { screenLock } from '@/session/screenLock';
import { sideButtonCenterForModel } from '@/session/sideButton';
import { useTheme } from '@/theme';

const REST: LockHintFrame = {
  p: 0,
  vis: 0,
  breath: 0,
  g: 0,
  glowOn: true,
  ov: 0,
  textA: 0,
  textDx: -8,
};

/** Large type leaves the button and sits in the column under the Klumpen. */
const FLOW_FONT_SCALE = 1.4;
/** Text-only phones have no button to center on. Upper area, right aligned. */
const TEXT_ONLY_CENTER = 0.28;

const consumedSessions = new Set<string>();

type Props = {
  /** This session was just started on this device. A restored session stays quiet. */
  enabled: boolean;
  sessionId: string | null;
  /** «gjenstår» fades with the scrim. The session screen owns the label. */
  labelOpacity: SharedValue<number>;
  /** Window Y of the hold caption. Large type sits just above it. */
  flowAnchorY: number | null;
};

function readDevice(): { phone: boolean; modelId: string | null } {
  try {
    const modelId = Device.modelId;
    if (modelId?.startsWith('iPad')) return { phone: false, modelId };
    if (modelId?.startsWith('iPhone')) return { phone: true, modelId };
    return { phone: Device.deviceType === Device.DeviceType.PHONE, modelId };
  } catch {
    return { phone: false, modelId: null };
  }
}

function hexRgb(hex: string): [number, number, number] {
  'worklet';
  const n = hex.replace('#', '');
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
}

function rgbHex(r: number, g: number, b: number): string {
  'worklet';
  const channel = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, '0');
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

function mixHex(from: string, to: string, t: number): string {
  'worklet';
  const [ar, ag, ab] = hexRgb(from);
  const [br, bg, bb] = hexRgb(to);
  return rgbHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}

function scaleHex(hex: string, amount: number): string {
  'worklet';
  const [r, g, b] = hexRgb(hex);
  return rgbHex(r * amount, g * amount, b * amount);
}

/**
 * In-app stand-in for the bezel bulge. The real bezel cannot move.
 * Tap anywhere closes it and is not forwarded to the Klumpen.
 */
export function LockHint({ enabled, sessionId, labelOpacity, flowAnchorY }: Props) {
  const { theme } = useTheme();
  const window = useWindowDimensions();
  const device = readDevice();
  const screen = Dimensions.get('screen');
  const centerY = sideButtonCenterForModel(device.modelId);
  const offer = lockHintOffer({
    fresh: enabled,
    phone: device.phone,
    portrait: window.height >= window.width,
    fullscreen: isFullscreenWindow(window.width, window.height, screen.width, screen.height),
    centerY,
  });

  const [live, setLive] = useState(false);
  const [capture, setCapture] = useState(false);
  const [granted, setGranted] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [contrast, setContrast] = useState(false);
  const [screenReader, setScreenReader] = useState(false);
  const [textHeight, setTextHeight] = useState(0);
  const [box, setBox] = useState({ width: window.width, height: window.height });

  const elapsed = useSharedValue(0);
  const frame = useSharedValue<LockHintFrame>(REST);
  const tapSv = useSharedValue(-1);
  const closed = useSharedValue(0);
  const reduceSv = useSharedValue(0);
  const contrastSv = useSharedValue(0);
  const holdSv = useSharedValue(0);
  const widthSv = useSharedValue(window.width);
  const heightSv = useSharedValue(window.height);
  const buttonYSv = useSharedValue(window.height * TEXT_ONLY_CENTER);
  const bulgeSv = useSharedValue(0);
  const flowSv = useSharedValue(0);
  const builderSv = useSharedValue(Skia.PathBuilder.Make());
  const bulgePath = useSharedValue(Skia.Path.Make());

  const matte = theme.color.glow.matte;
  const core = theme.color.glow.core;
  const amber = theme.color.glow.amber;
  const paper = theme.color.session['text-primary'];
  const pixelRatio = PixelRatio.get();

  const finishRef = useRef<() => void>(() => undefined);
  const finishFromUI = useCallback(() => {
    finishRef.current();
  }, []);

  const onFrame = useCallback(
    (info: { timeSinceFirstFrame: number }) => {
      'worklet';
      const t = info.timeSinceFirstFrame;
      elapsed.value = t;
      const tap = tapSv.value < 0 ? null : tapSv.value;
      const next = lockHintState(t, reduceSv.value === 1, contrastSv.value === 1, tap, holdSv.value === 1);
      frame.value = next;
      labelOpacity.value = remainingLabelOpacity(next.ov);
      const tapDone =
        tap != null && t >= tap + 400 && next.p < 0.01 && next.ov < 0.01 && next.textA < 0.01;
      if ((lockHintSettled(t, next, tap, holdSv.value === 1) || tapDone) && closed.value === 0) {
        closed.value = 1;
        runOnJS(finishFromUI)();
      }
    },
    [closed, contrastSv, elapsed, finishFromUI, frame, holdSv, labelOpacity, reduceSv, tapSv],
  );
  const frames = useFrameCallback(onFrame, false);

  const finish = useCallback(() => {
    if (sessionId) consumedSessions.add(sessionId);
    frames.setActive(false);
    labelOpacity.value = 1;
    setCapture(false);
    setLive(false);
  }, [frames, labelOpacity, sessionId]);
  finishRef.current = finish;

  useEffect(() => {
    if (!enabled || offer === 'hidden' || !sessionId || consumedSessions.has(sessionId)) {
      setLive(false);
      labelOpacity.value = 1;
      return;
    }
    setLive(true);
  }, [enabled, labelOpacity, offer, sessionId]);

  useEffect(() => {
    if (!live) {
      frames.setActive(false);
      return;
    }
    tapSv.value = -1;
    closed.value = 0;
    frames.setActive(true);
    return () => frames.setActive(false);
  }, [closed, frames, live, tapSv]);

  useEffect(() => {
    reduceSv.value = reduceMotion ? 1 : 0;
    contrastSv.value = contrast ? 1 : 0;
    holdSv.value = screenReader ? 1 : 0;
    widthSv.value = box.width;
    heightSv.value = box.height;
    const button = offer === 'bulge' ? centerY : null;
    buttonYSv.value = button ?? box.height * TEXT_ONLY_CENTER;
    bulgeSv.value = button == null ? 0 : 1;
    flowSv.value = window.fontScale > FLOW_FONT_SCALE ? 1 : 0;
  }, [
    box.height,
    box.width,
    bulgeSv,
    buttonYSv,
    centerY,
    contrast,
    contrastSv,
    flowSv,
    heightSv,
    holdSv,
    offer,
    reduceMotion,
    reduceSv,
    screenReader,
    widthSv,
    window.fontScale,
  ]);

  useEffect(() => {
    if (!enabled) return;
    let cancel = false;
    hasNotificationPermission()
      .then((ok) => {
        if (!cancel) setGranted(ok);
      })
      .catch(() => undefined);
    return () => {
      cancel = true;
    };
  }, [enabled]);

  useEffect(() => {
    const darker = { current: false };
    const transparent = { current: false };
    const publish = () => setContrast(darker.current || transparent.current);
    let cancel = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (!cancel) setReduceMotion(value);
      })
      .catch(() => undefined);
    AccessibilityInfo.isDarkerSystemColorsEnabled()
      .then((value) => {
        darker.current = value;
        if (!cancel) publish();
      })
      .catch(() => undefined);
    AccessibilityInfo.isReduceTransparencyEnabled()
      .then((value) => {
        transparent.current = value;
        if (!cancel) publish();
      })
      .catch(() => undefined);
    AccessibilityInfo.isScreenReaderEnabled()
      .then((value) => {
        if (!cancel) setScreenReader(value);
      })
      .catch(() => undefined);
    const subs = [
      AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion),
      AccessibilityInfo.addEventListener('darkerSystemColorsChanged', (value) => {
        darker.current = value;
        publish();
      }),
      AccessibilityInfo.addEventListener('reduceTransparencyChanged', (value) => {
        transparent.current = value;
        publish();
      }),
      AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReader),
    ];
    return () => {
      cancel = true;
      subs.forEach((sub) => sub.remove());
    };
  }, []);

  useEffect(() => {
    if (!live) return;
    const app = AppState.addEventListener('change', (next) => {
      if (next === 'background') finishRef.current();
    });
    const lock = screenLock.addLockListener(() => finishRef.current());
    return () => {
      app.remove();
      lock.remove();
    };
  }, [live]);

  useAnimatedReaction(
    () => {
      const t = elapsed.value;
      const current = frame.value;
      const gone = t > LOCK_HINT_DELAY_MS + 500 && current.p < 0.01 && current.ov < 0.01 && current.textA < 0.01;
      return t >= LOCK_HINT_DELAY_MS && !gone;
    },
    (visible, previous) => {
      if (visible !== previous) runOnJS(setCapture)(visible);
    },
  );

  const speech = lockHintSpeech(granted);
  const speechRef = useRef(speech);
  speechRef.current = speech;
  const announce = useCallback(() => {
    AccessibilityInfo.announceForAccessibility(speechRef.current);
  }, []);

  useAnimatedReaction(
    () => frame.value.textA > 0.45,
    (ready, previous) => {
      if (ready && !previous) runOnJS(announce)();
    },
    [announce],
  );

  const textStyle = useAnimatedStyle(() => ({
    opacity: frame.value.textA,
    transform: [{ translateX: flowSv.value === 1 ? 0 : frame.value.textDx }],
  }));

  const scrimOpacity = useDerivedValue(() => frame.value.ov);
  const bodyOpacity = useDerivedValue(() => {
    const current = frame.value;
    if (!current.glowOn) return current.vis;
    return current.vis * (BULGE_MATTE_ALPHA + (BULGE_CORE_ALPHA - BULGE_MATTE_ALPHA) * current.g);
  });
  const bodyColors = useDerivedValue(() => {
    const current = frame.value;
    if (!current.glowOn) return [paper, paper];
    const mixed = mixHex(matte, core, current.g);
    return [scaleHex(mixed, 0.72), mixed];
  });
  const glowOpacity = useDerivedValue(() => {
    const current = frame.value;
    if (!current.glowOn) return 0;
    return Math.min(1, current.g * current.vis * BULGE_GLOW_ALPHA * 2.2);
  });
  const rimOpacity = useDerivedValue(() => {
    const current = frame.value;
    if (!current.glowOn) return 0;
    return BULGE_RIM_ALPHA * (0.5 + 0.5 * current.g) * current.vis * current.p;
  });
  const scrimColors = useDerivedValue(() => {
    const left = contrastSv.value === 1 ? LOCK_HINT_OVERLAY_CONTRAST : LOCK_HINT_OVERLAY_LEFT;
    const right = contrastSv.value === 1 ? LOCK_HINT_OVERLAY_CONTRAST : LOCK_HINT_OVERLAY_RIGHT;
    return [hexAlpha(LOCK_HINT_OVERLAY, left), hexAlpha(LOCK_HINT_OVERLAY, right)];
  });
  const gradientStart = useDerivedValue(() => vec(0, 0));
  const gradientEnd = useDerivedValue(() => vec(widthSv.value, 0));
  const edgeStart = useDerivedValue(() => vec(widthSv.value - 8, 0));
  const edgeEnd = useDerivedValue(() => vec(widthSv.value, 0));

  // Reads the clock directly so the path rebuilds every frame. A nested worklet
  // would not subscribe the Skia path to `elapsed`.
  useDerivedValue(() => {
    const t = elapsed.value;
    const current = lockHintState(
      t,
      reduceSv.value === 1,
      contrastSv.value === 1,
      tapSv.value < 0 ? null : tapSv.value,
      holdSv.value === 1,
    );
    const builder = builderSv.value;
    builder.reset();
    if (bulgeSv.value === 1 && current.p > 0.001) {
      const width = widthSv.value;
      const cy = buttonYSv.value;
      const span = 110;
      const top = cy - span;
      const bottom = cy + span;
      const steps = 56;
      builder.moveTo(width, top);
      for (let i = 0; i <= steps; i += 1) {
        const y = top + ((bottom - top) * i) / steps;
        builder.lineTo(width - bulgeDepth(y, cy, current.p, current.breath), y);
      }
      builder.lineTo(width, bottom);
      builder.close();
    }
    const next = builder.build();
    bulgePath.value = next;
    // Skia's reconciler reads `_value`. Assigning `.value` alone does not invalidate the path.
    (bulgePath as SharedValue<typeof next> & { _value: typeof next })._value = next;
    return t;
  });

  if (!live || offer === 'hidden') return null;

  const flow = window.fontScale > FLOW_FONT_SCALE;
  const anchor = offer === 'bulge' && centerY != null ? centerY : box.height * TEXT_ONLY_CENTER;
  const textTop = flow
    ? (flowAnchorY != null && textHeight > 0 ? flowAnchorY - textHeight - 12 : box.height * 0.62 - textHeight)
    : anchor - textHeight / 2;
  const copy = lockHintCopy(granted);

  const onTap = () => {
    if (tapSv.value >= 0) return;
    tapSv.value = elapsed.value;
  };

  return (
    <View
      pointerEvents={capture ? 'auto' : 'box-none'}
      style={styles.fill}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setBox({ width, height });
      }}
    >
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={styles.fill}>
        <Canvas style={{ width: box.width, height: box.height }}>
          <Rect x={0} y={0} width={box.width} height={box.height} opacity={scrimOpacity}>
            <LinearGradient start={gradientStart} end={gradientEnd} colors={scrimColors} />
          </Rect>
          <Group opacity={rimOpacity} layer={<Paint><Blur blur={BULGE_RIM_SIGMA_PT * pixelRatio} /></Paint>}>
            <Circle cx={box.width} cy={anchor} r={10} color={amber} />
          </Group>
          <Group opacity={glowOpacity} layer={<Paint><Blur blur={BULGE_GLOW_RADIUS_PT * pixelRatio} /></Paint>}>
            <Path path={bulgePath} color={amber} />
          </Group>
          <Path path={bulgePath} opacity={bodyOpacity}>
            <LinearGradient start={edgeStart} end={edgeEnd} colors={bodyColors} />
          </Path>
        </Canvas>
      </View>
      {capture ? (
        <Pressable accessibilityElementsHidden={false} accessible={false} onPress={onTap} style={styles.fill}>
          <HintText
            copy={copy}
            speech={speech}
            color={paper}
            fontFamily={theme.fonts.sans}
            flow={flow}
            textTop={textTop}
            textStyle={textStyle}
            onHeight={setTextHeight}
          />
        </Pressable>
      ) : (
        <HintText
          copy={copy}
          speech={speech}
          color={paper}
          fontFamily={theme.fonts.sans}
          flow={flow}
          textTop={textTop}
          textStyle={textStyle}
          onHeight={setTextHeight}
        />
      )}
    </View>
  );
}

function hexAlpha(hex: string, alpha: number): string {
  'worklet';
  const [r, g, b] = hexRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function HintText({
  copy,
  speech,
  color,
  fontFamily,
  flow,
  textTop,
  textStyle,
  onHeight,
}: {
  copy: string;
  speech: string;
  color: string;
  fontFamily: string;
  flow: boolean;
  textTop: number;
  textStyle: object;
  onHeight: (height: number) => void;
}) {
  return (
    <Animated.Text
      accessibilityRole="text"
      accessibilityLabel={speech}
      maxFontSizeMultiplier={2.5}
      pointerEvents="none"
      onLayout={(event) => onHeight(event.nativeEvent.layout.height)}
      style={[
        styles.hint,
        {
          top: textTop,
          color,
          fontFamily,
          textAlign: flow ? 'center' : 'right',
          left: flow ? 32 : undefined,
          right: flow ? 32 : LOCK_HINT_TEXT_RIGHT_PT,
        },
        textStyle,
      ]}
    >
      {copy}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  hint: {
    position: 'absolute',
    fontSize: 17,
    lineHeight: 23,
  },
});
