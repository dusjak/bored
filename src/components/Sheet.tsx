import { useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type HostInstance,
  type LayoutChangeEvent,
} from 'react-native';
import {
  GestureDetector,
  GestureHandlerRootView,
  GestureStateManager,
  useNativeGesture,
  usePanGesture,
  useSimultaneousGestures,
} from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedProps,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import { SheetTitleProvider } from '@/sheet/title';
import {
  SHEET_BACKDROP,
  SHEET_BACKDROP_MAX,
  SHEET_CLOSE_BEZIER,
  SHEET_CLOSE_MS,
  SHEET_DRAG_ZONE,
  SHEET_GRABBER,
  SHEET_GRABBER_HEIGHT,
  SHEET_GRABBER_TOP,
  SHEET_GRABBER_WIDTH,
  SHEET_HIT_MIN,
  SHEET_OPEN_BEZIER,
  SHEET_OPEN_MS,
  SHEET_REDUCE_IN_MS,
  SHEET_REDUCE_OUT_MS,
  SHEET_SPRING,
  SHEET_SWIPE_CLOSE_BEZIER,
  SHEET_SWIPE_CLOSE_MS,
  backdropOpacityForTranslate,
  fingerToTranslate,
  shouldDismissSheet,
  translateToFinger,
} from '@/sheet/motion';
import { useTheme } from '@/theme';

type Phase = 'hidden' | 'mounting' | 'opening' | 'open' | 'closing';

export type SheetProps = {
  visible: boolean;
  onClose: () => void;
  /**
   * Backdrop tap, swipe, grabber, and escape can close the sheet.
   * Turn this off when the sheet has to finish, such as ending a session.
   * The grabber stays visible and does nothing. No shake.
   */
  dismissible?: boolean;
  /**
   * Wraps children in a scroll view. A downward drag from content parked at
   * the top closes the sheet. Leave this off when the sheet has its own pans.
   */
  scrollable?: boolean;
  /** Host that opened the sheet. Focus returns here after close. */
  returnFocusRef?: RefObject<HostInstance | null>;
  children: ReactNode;
};

function focusHost(node: HostInstance | null) {
  if (node == null) return;
  const handle = findNodeHandle(node);
  if (handle != null) AccessibilityInfo.setAccessibilityFocus(handle);
}

function travelOf(sheetH: SharedValue<number>, windowH: SharedValue<number>) {
  'worklet';
  return sheetH.value > 0 ? sheetH.value : Math.max(windowH.value, 1);
}

function openTiming() {
  'worklet';
  return {
    duration: SHEET_OPEN_MS,
    easing: Easing.bezier(SHEET_OPEN_BEZIER[0], SHEET_OPEN_BEZIER[1], SHEET_OPEN_BEZIER[2], SHEET_OPEN_BEZIER[3]),
    reduceMotion: ReduceMotion.Never,
  };
}

function closeTiming() {
  'worklet';
  return {
    duration: SHEET_CLOSE_MS,
    easing: Easing.bezier(SHEET_CLOSE_BEZIER[0], SHEET_CLOSE_BEZIER[1], SHEET_CLOSE_BEZIER[2], SHEET_CLOSE_BEZIER[3]),
    reduceMotion: ReduceMotion.Never,
  };
}

function swipeTiming() {
  'worklet';
  return {
    duration: SHEET_SWIPE_CLOSE_MS,
    easing: Easing.bezier(
      SHEET_SWIPE_CLOSE_BEZIER[0],
      SHEET_SWIPE_CLOSE_BEZIER[1],
      SHEET_SWIPE_CLOSE_BEZIER[2],
      SHEET_SWIPE_CLOSE_BEZIER[3],
    ),
    reduceMotion: ReduceMotion.Never,
  };
}

function fadeTiming(duration: number) {
  'worklet';
  return { duration, easing: Easing.inOut(Easing.sin), reduceMotion: ReduceMotion.Never };
}

/**
 * Bottom sheet used by every sheet and modal in the app.
 * Open 520ms, close 360ms, dim synced to the sheet, swipe-to-dismiss, Reduce Motion crossfade.
 * Pass `scrollable` when the body itself scrolls. Pass `dismissible={false}` when it must stay up.
 */
export function Sheet({
  visible,
  onClose,
  dismissible = true,
  scrollable = false,
  returnFocusRef,
  children,
}: SheetProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const { height: windowHeight } = useWindowDimensions();

  const translateY = useSharedValue(reducedMotion ? 0 : windowHeight);
  const sheetOpacity = useSharedValue(reducedMotion ? 0 : 1);
  const backdropOpacity = useSharedValue(0);
  const backdropDriven = useSharedValue(reducedMotion ? 0 : 1);
  const sheetH = useSharedValue(0);
  const windowH = useSharedValue(windowHeight);
  const reduce = useSharedValue(reducedMotion);
  const closing = useSharedValue(0);
  const dragging = useSharedValue(0);
  const finger = useSharedValue(0);
  const lastVelocity = useSharedValue(0);
  const dismissibleSV = useSharedValue(dismissible);
  const scrollY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const scrollEnabled = useSharedValue(true);
  const scrollDragOn = useSharedValue(dismissible && scrollable);

  reduce.value = reducedMotion;
  dismissibleSV.value = dismissible;
  scrollDragOn.value = dismissible && scrollable;
  windowH.value = windowHeight;

  const [mounted, setMounted] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const phaseRef = useRef<Phase>('hidden');
  const closingRef = useRef(false);
  const swipeDrivenRef = useRef(false);
  const focused = useRef(false);
  const visibleRef = useRef(visible);
  const dismissibleRef = useRef(dismissible);
  const onCloseRef = useRef(onClose);
  const titleNode = useRef<HostInstance | null>(null);
  const sheetHost = useRef<HostInstance | null>(null);
  visibleRef.current = visible;
  dismissibleRef.current = dismissible;
  onCloseRef.current = onClose;

  const registerTitle = useCallback((node: HostInstance | null) => {
    titleNode.current = node;
  }, []);

  const settleOpen = useCallback(() => {
    if (!visibleRef.current || closingRef.current) return;
    phaseRef.current = 'open';
    setInteractive(true);
    if (focused.current) return;
    focused.current = true;
    focusHost(titleNode.current ?? sheetHost.current);
  }, []);

  const finishClose = useCallback(() => {
    if (visibleRef.current) return;
    phaseRef.current = 'hidden';
    closingRef.current = false;
    swipeDrivenRef.current = false;
    focused.current = false;
    setMounted(false);
    setInteractive(false);
    const node = returnFocusRef?.current ?? null;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => focusHost(node));
    });
  }, [returnFocusRef]);

  const markSwipeClose = useCallback(() => {
    if (swipeDrivenRef.current) return;
    swipeDrivenRef.current = true;
    closingRef.current = true;
    phaseRef.current = 'closing';
    setInteractive(false);
    if (visibleRef.current) onCloseRef.current();
  }, []);

  const requestClose = useCallback(() => {
    if (!dismissibleRef.current || closingRef.current || !visibleRef.current) return;
    onCloseRef.current();
  }, []);

  const playGrab = useCallback(() => {
    'worklet';
    if (closing.value === 1) return;
    cancelAnimation(translateY);
    cancelAnimation(sheetOpacity);
    cancelAnimation(backdropOpacity);
    finger.value = translateToFinger(translateY.value, travelOf(sheetH, windowH));
    lastVelocity.value = 0;
    dragging.value = 1;
    backdropDriven.value = 1;
    scrollEnabled.value = false;
    if (reduce.value) sheetOpacity.value = 1;
  }, [backdropDriven, backdropOpacity, closing, dragging, finger, lastVelocity, reduce, scrollEnabled, sheetH, sheetOpacity, translateY, windowH]);

  const playDrag = useCallback((translationY: number) => {
    'worklet';
    if (closing.value === 1 || dragging.value === 0) return;
    translateY.value = fingerToTranslate(finger.value + translationY, travelOf(sheetH, windowH));
  }, [closing, dragging, finger, sheetH, translateY, windowH]);

  const playRelease = useCallback((velocityY: number, canceled: boolean) => {
    'worklet';
    dragging.value = 0;
    scrollEnabled.value = true;
    if (closing.value === 1) return;
    const limit = travelOf(sheetH, windowH);
    if (!canceled && dismissibleSV.value && shouldDismissSheet(translateY.value, limit, velocityY)) {
      closing.value = 1;
      const done = (finished?: boolean) => {
        'worklet';
        if (finished) scheduleOnRN(finishClose);
      };
      scheduleOnRN(markSwipeClose);
      if (reduce.value) {
        backdropOpacity.value = backdropOpacityForTranslate(translateY.value, limit);
        backdropDriven.value = 0;
        const fade = fadeTiming(SHEET_REDUCE_OUT_MS);
        sheetOpacity.value = withTiming(0, fade, done);
        backdropOpacity.value = withTiming(0, fade);
        return;
      }
      backdropDriven.value = 1;
      sheetOpacity.value = 1;
      translateY.value = withTiming(limit, swipeTiming(), done);
      return;
    }
    backdropDriven.value = 1;
    if (reduce.value) sheetOpacity.value = 1;
    translateY.value = withSpring(
      0,
      {
        mass: SHEET_SPRING.mass,
        stiffness: SHEET_SPRING.stiffness,
        damping: SHEET_SPRING.damping,
        velocity: velocityY,
        reduceMotion: ReduceMotion.Never,
      },
      (finished) => {
        'worklet';
        if (finished && closing.value === 0) scheduleOnRN(settleOpen);
      },
    );
  }, [
    backdropDriven,
    backdropOpacity,
    closing,
    dismissibleSV,
    dragging,
    finishClose,
    markSwipeClose,
    reduce,
    scrollEnabled,
    settleOpen,
    sheetH,
    sheetOpacity,
    translateY,
    windowH,
  ]);

  const playOpen = useCallback(() => {
    'worklet';
    closing.value = 0;
    dragging.value = 0;
    scrollEnabled.value = true;
    cancelAnimation(translateY);
    cancelAnimation(sheetOpacity);
    cancelAnimation(backdropOpacity);
    const limit = travelOf(sheetH, windowH);
    const done = (finished?: boolean) => {
      'worklet';
      if (finished) scheduleOnRN(settleOpen);
    };
    if (reduce.value) {
      translateY.value = 0;
      backdropDriven.value = 0;
      const fade = fadeTiming(SHEET_REDUCE_IN_MS);
      sheetOpacity.value = withTiming(1, fade, done);
      backdropOpacity.value = withTiming(SHEET_BACKDROP_MAX, fade);
      return;
    }
    sheetOpacity.value = 1;
    backdropDriven.value = 1;
    // A value past the sheet is still offscreen. Pull it back to the sheet height, then rise.
    // A reopen mid-close is already between 0 and the height, so it continues from there.
    if (translateY.value > limit) translateY.value = limit;
    translateY.value = withTiming(0, openTiming(), done);
  }, [backdropDriven, backdropOpacity, closing, dragging, reduce, scrollEnabled, settleOpen, sheetH, sheetOpacity, translateY, windowH]);

  const playClose = useCallback(() => {
    'worklet';
    if (closing.value === 1) return;
    closing.value = 1;
    dragging.value = 0;
    scrollEnabled.value = true;
    cancelAnimation(translateY);
    cancelAnimation(sheetOpacity);
    cancelAnimation(backdropOpacity);
    const limit = travelOf(sheetH, windowH);
    const done = (finished?: boolean) => {
      'worklet';
      if (finished) scheduleOnRN(finishClose);
    };
    if (reduce.value) {
      backdropOpacity.value = backdropOpacityForTranslate(translateY.value, limit);
      backdropDriven.value = 0;
      const fade = fadeTiming(SHEET_REDUCE_OUT_MS);
      sheetOpacity.value = withTiming(0, fade, done);
      backdropOpacity.value = withTiming(0, fade);
      return;
    }
    sheetOpacity.value = 1;
    backdropDriven.value = 1;
    translateY.value = withTiming(limit, closeTiming(), done);
  }, [backdropDriven, backdropOpacity, closing, dragging, finishClose, reduce, scrollEnabled, sheetH, sheetOpacity, translateY, windowH]);

  const openRef = useRef(playOpen);
  const closeRef = useRef(playClose);
  openRef.current = playOpen;
  closeRef.current = playClose;

  useLayoutEffect(() => {
    if (visible) {
      if (phaseRef.current === 'closing') {
        closingRef.current = false;
        swipeDrivenRef.current = false;
        phaseRef.current = 'opening';
        setInteractive(false);
        setMounted(true);
        scheduleOnUI(openRef.current);
        return;
      }
      if (phaseRef.current === 'hidden') {
        closing.value = 0;
        dragging.value = 0;
        scrollEnabled.value = true;
        if (reducedMotion) {
          translateY.value = 0;
          sheetOpacity.value = 0;
          backdropDriven.value = 0;
          backdropOpacity.value = 0;
        } else {
          sheetOpacity.value = 1;
          backdropDriven.value = 1;
          backdropOpacity.value = 0;
          // Far enough that a sheet taller than the window is still below the screen.
          translateY.value = Math.max(windowHeight * 2, 1);
        }
        phaseRef.current = 'mounting';
        closingRef.current = false;
        swipeDrivenRef.current = false;
        focused.current = false;
        setInteractive(false);
        setMounted(true);
      }
      return;
    }
    if (phaseRef.current === 'hidden') return;
    if (swipeDrivenRef.current) return;
    if (phaseRef.current === 'closing') return;
    if (phaseRef.current === 'mounting') {
      phaseRef.current = 'hidden';
      setMounted(false);
      return;
    }
    phaseRef.current = 'closing';
    closingRef.current = true;
    setInteractive(false);
    scheduleOnUI(closeRef.current);
  }, [
    backdropDriven,
    backdropOpacity,
    closing,
    dragging,
    reducedMotion,
    scrollEnabled,
    sheetOpacity,
    translateY,
    visible,
    windowHeight,
  ]);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.height;
    if (next <= 0) return;
    sheetH.value = next;
    if (visibleRef.current && phaseRef.current === 'mounting') {
      phaseRef.current = 'opening';
      scheduleOnUI(openRef.current);
    }
  }, [sheetH]);

  const headerGesture = usePanGesture(
    useMemo(
      () => ({
        enabled: dismissibleSV,
        maxPointers: 1,
        activeOffsetY: [-8, 8] as [number, number],
        failOffsetX: [-24, 24] as [number, number],
        onActivate: () => {
          'worklet';
          playGrab();
        },
        onUpdate: (event: { translationY: number; velocityY?: number }) => {
          'worklet';
          if (typeof event.velocityY === 'number') lastVelocity.value = event.velocityY;
          playDrag(event.translationY);
        },
        onDeactivate: (event: { canceled: boolean; velocityY?: number }) => {
          'worklet';
          const velocity = event.velocityY ?? lastVelocity.value;
          playRelease(event.canceled ? 0 : velocity, event.canceled);
        },
      }),
      [dismissibleSV, lastVelocity, playDrag, playGrab, playRelease],
    ),
  );

  const scrollGesture = usePanGesture(
    useMemo(
      () => ({
        enabled: scrollDragOn,
        manualActivation: true,
        maxPointers: 1,
        onTouchesDown: (event: { handlerTag: number; allTouches: { absoluteX: number; absoluteY: number }[] }) => {
          'worklet';
          const touch = event.allTouches[0];
          if (!touch || !scrollDragOn.value || closing.value === 1) {
            GestureStateManager.fail(event.handlerTag);
            return;
          }
          if (scrollY.value > 0.5) {
            GestureStateManager.fail(event.handlerTag);
            return;
          }
          startY.value = touch.absoluteY;
          startX.value = touch.absoluteX;
        },
        onTouchesMove: (event: { handlerTag: number; allTouches: { absoluteX: number; absoluteY: number }[] }) => {
          'worklet';
          const touch = event.allTouches[0];
          if (!touch || dragging.value === 1) return;
          const dy = touch.absoluteY - startY.value;
          const dx = touch.absoluteX - startX.value;
          if (Math.abs(dy) < 8 && Math.abs(dx) < 8) return;
          if (dy > 0 && Math.abs(dy) > Math.abs(dx) && scrollY.value <= 0.5) {
            GestureStateManager.activate(event.handlerTag);
            return;
          }
          GestureStateManager.fail(event.handlerTag);
        },
        onTouchesUp: (event: { handlerTag: number }) => {
          'worklet';
          if (dragging.value === 1) return;
          GestureStateManager.fail(event.handlerTag);
        },
        onTouchesCancel: (event: { handlerTag: number }) => {
          'worklet';
          GestureStateManager.fail(event.handlerTag);
        },
        onActivate: () => {
          'worklet';
          playGrab();
        },
        onUpdate: (event: { translationY: number; velocityY?: number }) => {
          'worklet';
          if (typeof event.velocityY === 'number') lastVelocity.value = event.velocityY;
          playDrag(event.translationY);
        },
        onDeactivate: (event: { canceled: boolean; velocityY?: number }) => {
          'worklet';
          const velocity = event.velocityY ?? lastVelocity.value;
          playRelease(event.canceled ? 0 : velocity, event.canceled);
        },
      }),
      [closing, dragging, lastVelocity, playDrag, playGrab, playRelease, scrollDragOn, scrollY, startX, startY],
    ),
  );

  const nativeScroll = useNativeGesture();
  const scrollComposed = useSimultaneousGestures(scrollGesture, nativeScroll);

  const backdropStyle = useAnimatedStyle(() => {
    const driven = backdropOpacityForTranslate(translateY.value, travelOf(sheetH, windowH));
    return { opacity: backdropDriven.value === 1 ? driven : backdropOpacity.value };
  });

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: sheetOpacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const scrollAnimatedProps = useAnimatedProps(() => ({
    scrollEnabled: scrollEnabled.value,
  }));

  const bottomPad = Math.max(insets.bottom, theme.space['6']);
  const scrollMaxHeight = Math.max(120, windowHeight - insets.top - SHEET_DRAG_ZONE - 8);
  const onEscape = dismissible ? requestClose : undefined;

  const body = scrollable ? (
    <GestureDetector gesture={scrollComposed}>
      <Animated.ScrollView
        animatedProps={scrollAnimatedProps}
        bounces={false}
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        pointerEvents={interactive ? 'auto' : 'none'}
        scrollEventThrottle={16}
        style={{ maxHeight: scrollMaxHeight }}
        contentContainerStyle={{ paddingBottom: bottomPad }}
      >
        {children}
      </Animated.ScrollView>
    </GestureDetector>
  ) : (
    <View pointerEvents={interactive ? 'auto' : 'none'} style={{ paddingBottom: bottomPad }}>
      {children}
    </View>
  );

  return (
    <ModalShell mounted={mounted} onRequestClose={onEscape}>
      <GestureHandlerRootView style={styles.fill}>
        <View style={styles.stage} pointerEvents="box-none">
          <Animated.View pointerEvents={dismissible ? 'auto' : 'none'} style={[styles.backdrop, backdropStyle]}>
            <Pressable
              accessibilityElementsHidden={!dismissible}
              accessibilityLabel="Lukk"
              accessibilityRole="button"
              disabled={!dismissible}
              importantForAccessibility={dismissible ? 'yes' : 'no-hide-descendants'}
              onPress={requestClose}
              style={styles.fill}
            />
          </Animated.View>
          <Animated.View onLayout={onLayout} style={[styles.sheet, { backgroundColor: theme.color.surface.sheet, borderTopLeftRadius: theme.radius.large, borderTopRightRadius: theme.radius.large }, sheetStyle]}>
            <View
              ref={sheetHost}
              accessibilityActions={dismissible ? [{ name: 'close', label: 'Lukk' }] : undefined}
              accessibilityViewIsModal
              collapsable={false}
              onAccessibilityAction={(event) => {
                if (event.nativeEvent.actionName === 'close') requestClose();
              }}
              onAccessibilityEscape={onEscape}
            >
              <GestureDetector gesture={headerGesture}>
                <View collapsable={false} style={styles.dragZone}>
                  <Pressable
                    accessibilityElementsHidden={!dismissible}
                    accessibilityLabel={dismissible ? 'Lukk' : undefined}
                    accessibilityRole={dismissible ? 'button' : undefined}
                    disabled={!dismissible}
                    importantForAccessibility={dismissible ? 'yes' : 'no-hide-descendants'}
                    onPress={requestClose}
                    style={styles.grabberHit}
                  >
                    <View style={styles.grabber} />
                  </Pressable>
                </View>
              </GestureDetector>
              <SheetTitleProvider register={registerTitle}>{body}</SheetTitleProvider>
              <View
                pointerEvents="none"
                style={[styles.extension, { backgroundColor: theme.color.surface.sheet, height: windowHeight * 2 }]}
              />
            </View>
          </Animated.View>
        </View>
      </GestureHandlerRootView>
    </ModalShell>
  );
}

function ModalShell({
  mounted,
  onRequestClose,
  children,
}: {
  mounted: boolean;
  onRequestClose?: () => void;
  children: ReactNode;
}) {
  return (
    <Modal
      animationType="none"
      navigationBarTranslucent
      onRequestClose={onRequestClose ?? (() => undefined)}
      statusBarTranslucent
      transparent
      visible={mounted}
    >
      {children}
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  stage: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: SHEET_BACKDROP },
  sheet: {},
  dragZone: { minHeight: SHEET_DRAG_ZONE, alignItems: 'center' },
  grabberHit: {
    width: SHEET_HIT_MIN,
    height: SHEET_HIT_MIN,
    alignItems: 'center',
    paddingTop: SHEET_GRABBER_TOP,
  },
  grabber: {
    width: SHEET_GRABBER_WIDTH,
    height: SHEET_GRABBER_HEIGHT,
    borderRadius: SHEET_GRABBER_HEIGHT / 2,
    backgroundColor: SHEET_GRABBER,
  },
  extension: { position: 'absolute', left: 0, right: 0, top: '100%', marginTop: -1 },
});
