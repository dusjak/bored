import { useEffect, useRef, type RefObject } from 'react';
import { StyleSheet, Text, View, type HostInstance } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { INTEREST_BODY, INTEREST_BUTTON, INTEREST_CAPTION, INTEREST_HEADER_LABEL, INTEREST_THANKS } from '@/backup/copy';
import { COMING_TAG_GAP, INTEREST_CAPTION_GAP, interestThanksColor } from '@/backup/interest';
import type { BackupKilde } from '@/analytics/track';
import { sikkerhetskopiTrykk } from '@/analytics/track';
import { ComingTag } from '@/components/backup/ComingTag';
import { Button } from '@/components/Button';
import { ContentColumn } from '@/components/ContentColumn';
import { Sheet } from '@/components/Sheet';
import { useRegisterSheetTitle } from '@/sheet/title';
import { sheetContentPullUp } from '@/sheet/motion';
import { useBackup } from '@/state/BackupState';
import { useTheme } from '@/theme';
import { screenTitleBox } from '@/theme/screenTitle';

type SheetKilde = Exclude<BackupKilde, 'logg_hint'>;

type Props = {
  visible: boolean;
  onClose: () => void;
  /** `deg` from the Deg row, `logg` when the hint's «sikkerhetskopi» opened it. */
  kilde: SheetKilde;
  /** Focus returns to the control that opened the sheet. */
  returnFocusRef?: RefObject<HostInstance | null>;
};

/**
 * Same sheet as «Velg varighet»: grabber, corners, dim, swipe down, tap outside.
 * The button becomes the thanks line and the sheet stays open.
 */
export function BackupInterestScreen({ visible, onClose, kilde, returnFocusRef }: Props) {
  const { theme } = useTheme();
  const backup = useBackup();
  const titleRef = useRegisterSheetTitle();
  const box = screenTitleBox('left');
  const noted = backup.interestNoted;
  const sent = useRef(false);

  useEffect(() => {
    if (!noted) sent.current = false;
  }, [noted]);

  const note = () => {
    if (noted || sent.current) return;
    sent.current = true;
    void Haptics.selectionAsync();
    void backup.noteInterest();
    sikkerhetskopiTrykk({
      knapp: 'sikkerhetskopi_meld_interesse',
      kilde,
      skjerm: 'sikkerhetskopi',
      hendelse: 'trykk',
      navn: INTEREST_BUTTON,
    });
  };

  return (
    <Sheet visible={visible} onClose={onClose} returnFocusRef={returnFocusRef}>
      <ContentColumn style={[styles.body, { marginTop: sheetContentPullUp(), paddingBottom: theme.space['2'] }]}>
        <View style={[styles.titleRow, { gap: COMING_TAG_GAP }]}>
          <Text
            ref={titleRef}
            accessibilityRole="header"
            accessibilityLabel={INTEREST_HEADER_LABEL}
            style={[
              theme.text.headline,
              {
                fontFamily: theme.fonts.serif,
                color: theme.color.text.primary,
                marginLeft: box.marginLeft,
                paddingLeft: box.paddingLeft,
              },
            ]}
          >
            Sikkerhetskopi
          </Text>
          <ComingTag variant="sheet" />
        </View>
        <Text style={[theme.text.body, { color: theme.color.text.secondary, marginTop: theme.space['4'] }]}>
          {INTEREST_BODY}
        </Text>
        <Text
          style={[
            theme.text.caption,
            styles.caption,
            { color: theme.color.text.tertiary, marginTop: theme.space['6'], marginBottom: INTEREST_CAPTION_GAP },
          ]}
        >
          {INTEREST_CAPTION}
        </Text>
        {backup.ready ? (
          <InterestAction noted={noted} visible={visible} onPress={note} />
        ) : (
          <View style={{ height: theme.size.button.comfort }} />
        )}
      </ContentColumn>
    </Sheet>
  );
}

function InterestAction({
  noted,
  visible,
  onPress,
}: {
  noted: boolean;
  visible: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const reduce = useReducedMotion() === true;
  const thanks = useSharedValue(noted ? 1 : 0);

  useEffect(() => {
    if (!visible || reduce) {
      thanks.value = noted ? 1 : 0;
      return;
    }
    thanks.value = withTiming(noted ? 1 : 0, {
      duration: theme.motion.fast,
      easing: Easing.out(Easing.cubic),
    });
  }, [noted, reduce, thanks, theme.motion.fast, visible]);

  const buttonStyle = useAnimatedStyle(() => ({ opacity: 1 - thanks.value }));
  const thanksStyle = useAnimatedStyle(() => ({ opacity: thanks.value }));
  const color = interestThanksColor(theme.name, {
    accent: theme.color.accent.default,
    link: theme.color.text.link,
  });

  return (
    <View style={{ height: theme.size.button.comfort }}>
      <Animated.View
        pointerEvents={noted ? 'none' : 'box-none'}
        accessibilityElementsHidden={noted}
        importantForAccessibility={noted ? 'no-hide-descendants' : 'auto'}
        style={[StyleSheet.absoluteFill, buttonStyle]}
      >
        <Button title={INTEREST_BUTTON} size="comfort" onPress={onPress} style={{ alignSelf: 'stretch' }} />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        accessibilityElementsHidden={!noted}
        importantForAccessibility={noted ? 'auto' : 'no-hide-descendants'}
        style={[StyleSheet.absoluteFill, styles.thanksSlot, thanksStyle]}
      >
        <Text
          accessibilityLabel={INTEREST_THANKS}
          accessibilityLiveRegion="polite"
          accessibilityRole="text"
          accessibilityState={{ disabled: true }}
          style={[theme.text.button, styles.thanks, { color }]}
        >
          {INTEREST_THANKS}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {},
  // Center of the tag meets the center of the title line. The cap box of this
  // face sits on that same center, so the chip is not top-aligned or on the baseline.
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  caption: { textAlign: 'center' },
  thanksSlot: { alignItems: 'center', justifyContent: 'center' },
  thanks: { textAlign: 'center' },
});
