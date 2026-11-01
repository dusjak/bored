import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { router, useFocusEffect } from 'expo-router';

import { presentAppleSheet } from '@/backup/apple';
import {
  ACCOUNT_ANONYMOUS,
  ACCOUNT_APPLE,
  ALERT_DELETE,
  ALERT_EXISTS,
  ALERT_EXISTS_BODY,
  ALERT_NEW,
  ALERT_NEW_BODY,
  ALERT_OFFLINE,
  ALERT_OFFLINE_DELETE,
  ALERT_OFFLINE_LINK,
  ALERT_SIGN_IN_FAILED,
  ALERT_SWITCH,
  ALERT_SWITCH_BODY,
  ALERT_TURN_OFF,
  ANONYMOUS_LIMIT,
  APPLE_HELP,
  BACKUP_TITLE,
  BETA_LABEL,
  CONFIRM_CANCEL,
  CONFIRM_CONTINUE,
  CONFIRM_DELETE,
  CONFIRM_NEW,
  CONFIRM_OK,
  CONFIRM_SWITCH,
  CONFIRM_TURN_OFF,
  CONTINUE_WITHOUT_ACCOUNT,
  DELETED_MESSAGE,
  DELETE_ACCOUNT,
  FETCHED_PREFIX,
  FETCHED_SAMPLE,
  FETCHED_SUFFIX,
  KEY_MISSING_BODY,
  KEY_MISSING_TITLE,
  LINK_APPLE_LABEL,
  LINKED_MESSAGE,
  PRIVACY,
  SCREEN_OFF_BODY,
  SIGN_IN_AGAIN,
  START_NEW_BACKUP,
  TRY_AGAIN,
  TURN_OFF,
  deleteAccountMessage,
  statusLine,
  storageLine,
  turnOffMessage,
} from '@/backup/copy';
import { resolveBackupView } from '@/backup/model';
import { deviceIsOnline } from '@/backup/net';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { requestNotificationPermission } from '@/data/notifications';
import { useAppState } from '@/state/AppState';
import { useBackup } from '@/state/BackupState';
import { useTheme } from '@/theme';

type Props = { backLabel: string };

/**
 * Screen 10 and its states. Deg and Logg both push this component.
 * Sync progress (10a, 10c, 10d, 10e, 10k) is left for v2: those frames say a
 * backup is in flight, and preview must not claim that.
 */
export function BackupScreen({ backLabel }: Props) {
  const { theme } = useTheme();
  const { user, refreshDailyReminder } = useAppState();
  const backup = useBackup();
  const view = resolveBackupView(backup.preview);
  const prompted = useRef<string | null>(null);
  const askedRestore = useRef(false);

  useEffect(() => {
    if (!backup.preview.forced) prompted.current = null;
  }, [backup.preview.forced]);

  useEffect(() => {
    const force = backup.preview.forced;
    if (force !== 'accountSwitch' && force !== 'alreadyExists') return;
    if (prompted.current === force) return;
    prompted.current = force;
    if (force === 'accountSwitch') presentSwitch();
    else presentExists();
    // The alert callbacks close over the latest backup actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backup.preview.forced]);

  useEffect(() => {
    if (view !== 'restored' || backup.preview.restorePermissionAsked) {
      if (backup.preview.restorePermissionAsked) askedRestore.current = false;
      return;
    }
    if (askedRestore.current) return;
    askedRestore.current = true;
    void (async () => {
      if (user.notifications !== true) {
        await backup.markRestorePermission(false);
        return;
      }
      const granted = await requestNotificationPermission();
      await backup.markRestorePermission(!granted);
      if (granted) await refreshDailyReminder();
    })();
  }, [backup, refreshDailyReminder, user.notifications, view]);

  const dismissNotice = backup.dismissNotice;
  useFocusEffect(
    useCallback(() => {
      return () => {
        void dismissNotice();
      };
    }, [dismissNotice]),
  );

  const failSignIn = () => {
    Alert.alert(ALERT_SIGN_IN_FAILED, 'noe gikk galt. prøv igjen.', [{ text: CONFIRM_OK }]);
  };

  const enableApple = async () => {
    if (backup.preview.forced === 'accountSwitch') {
      presentSwitch();
      return;
    }
    const result = await presentAppleSheet();
    if (result === 'cancelled') return;
    if (result === 'failed') {
      failSignIn();
      return;
    }
    await backup.enableWithApple();
  };

  const linkApple = async () => {
    if (backup.preview.forced === 'alreadyExists') {
      presentExists();
      return;
    }
    if (!(await deviceIsOnline())) {
      Alert.alert(ALERT_OFFLINE, ALERT_OFFLINE_LINK, [{ text: CONFIRM_OK }]);
      return;
    }
    const result = await presentAppleSheet();
    if (result === 'cancelled') return;
    if (result === 'failed') {
      failSignIn();
      return;
    }
    await backup.linkApple();
  };

  const askTurnOff = () => {
    const anonymous = backup.preview.account === 'anonymous';
    Alert.alert(ALERT_TURN_OFF, turnOffMessage(backup.mode, anonymous), [
      { text: CONFIRM_CANCEL, style: 'cancel' },
      {
        text: CONFIRM_TURN_OFF,
        style: anonymous ? 'destructive' : 'default',
        onPress: () => {
          void backup.turnOff();
        },
      },
    ]);
  };

  const askDelete = () => {
    void (async () => {
      if (!(await deviceIsOnline())) {
        Alert.alert(ALERT_OFFLINE, ALERT_OFFLINE_DELETE, [{ text: CONFIRM_OK }]);
        return;
      }
      Alert.alert(ALERT_DELETE, deleteAccountMessage(backup.mode), [
        { text: CONFIRM_CANCEL, style: 'cancel' },
        {
          text: CONFIRM_DELETE,
          style: 'destructive',
          onPress: () => {
            void (async () => {
              if (!(await deviceIsOnline())) {
                Alert.alert(ALERT_OFFLINE, ALERT_OFFLINE_DELETE, [{ text: CONFIRM_OK }]);
                return;
              }
              await backup.deleteAccount();
            })();
          },
        },
      ]);
    })();
  };

  function presentSwitch() {
    Alert.alert(ALERT_SWITCH, ALERT_SWITCH_BODY, [
      { text: CONFIRM_CANCEL, style: 'cancel', onPress: () => void backup.cancelAccountSwitch() },
      { text: CONFIRM_SWITCH, onPress: () => void backup.confirmAccountSwitch() },
    ]);
  }

  function presentExists() {
    Alert.alert(ALERT_EXISTS, ALERT_EXISTS_BODY, [
      { text: CONFIRM_CANCEL, style: 'cancel', onPress: () => void backup.cancelExistingBackup() },
      { text: CONFIRM_CONTINUE, onPress: () => void backup.confirmExistingBackup() },
    ]);
  }

  const askNewCopy = () => {
    Alert.alert(ALERT_NEW, ALERT_NEW_BODY, [
      { text: CONFIRM_CANCEL, style: 'cancel' },
      { text: CONFIRM_NEW, style: 'destructive', onPress: () => void backup.startNewCopy() },
    ]);
  };

  const showSignIn = view === 'off' || view === 'deleted' || view === 'signedOut';
  const showOnActions = view === 'on' || view === 'restored' || view === 'linked' || view === 'stale';
  const previewStatus = statusLine(backup.mode);

  return (
    <Screen scroll edges={['top']} contentStyle={styles.content}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={backLabel}
        onPress={() => router.back()}
        style={[styles.back, { gap: theme.space['1'] }]}
      >
        <Icon name="chevronLeft" size={22} color={theme.color.text.primary} />
        <Text style={[theme.text.body, { color: theme.color.text.primary }]}>{backLabel}</Text>
      </Pressable>

      <View style={[styles.titleRow, { gap: theme.space['2'], marginTop: theme.space['4'] }]}>
        <Text accessibilityRole="header" style={[theme.text.headline, { color: theme.color.text.primary }]}>
          {BACKUP_TITLE}
        </Text>
        {backup.mode === 'preview' ? (
          <View
            style={[
              styles.beta,
              {
                backgroundColor: theme.color.button['tertiary-bg'],
                borderRadius: theme.radius.pill,
                paddingHorizontal: theme.space['2'],
              },
            ]}
          >
            <Text style={[theme.text.labelSmall, { color: theme.color.text.secondary }]}>{BETA_LABEL}</Text>
          </View>
        ) : null}
      </View>

      {view === 'deleted' ? (
        <Text style={[theme.text.bodySmall, { color: theme.color.text.primary, marginTop: theme.space['4'] }]}>
          {DELETED_MESSAGE}
        </Text>
      ) : null}
      {view === 'signedOut' ? (
        <Text style={[theme.text.bodySmall, { color: theme.color.text.primary, marginTop: theme.space['4'] }]}>
          {SIGN_IN_AGAIN}
        </Text>
      ) : null}
      {view === 'keyMissing' ? (
        <Text style={[theme.text.body, { color: theme.color.text.primary, marginTop: theme.space['4'] }]}>
          {KEY_MISSING_TITLE}
        </Text>
      ) : null}

      {previewStatus && (showOnActions || view === 'anonymous') ? (
        <Text style={[theme.text.bodySmall, { color: theme.color.text.secondary, marginTop: theme.space['4'] }]}>
          {previewStatus}
        </Text>
      ) : null}

      {showOnActions || view === 'anonymous' ? (
        <Text style={[theme.text.bodySmall, { color: theme.color.text.secondary, marginTop: theme.space['1'] }]}>
          {view === 'anonymous' ? ACCOUNT_ANONYMOUS : ACCOUNT_APPLE}
        </Text>
      ) : null}

      {view === 'restored' ? (
        <Text style={[theme.text.bodySmall, { color: theme.color.text.primary, marginTop: theme.space['4'] }]}>
          {FETCHED_PREFIX} <Text style={theme.text.monoData}>{FETCHED_SAMPLE}</Text> {FETCHED_SUFFIX}
        </Text>
      ) : null}
      {view === 'linked' ? (
        <Text style={[theme.text.bodySmall, { color: theme.color.text.primary, marginTop: theme.space['4'] }]}>
          {LINKED_MESSAGE}
        </Text>
      ) : null}

      {showSignIn ? (
        <View style={{ marginTop: theme.space['4'] }}>
          <Text style={[theme.text.body, { color: theme.color.text.primary }]}>{SCREEN_OFF_BODY}</Text>
          <Text style={[theme.text.bodySmall, { color: theme.color.text.secondary, marginTop: theme.space['3'] }]}>
            {storageLine(backup.mode)}
          </Text>
          <View style={{ marginTop: theme.space['10'] }}>
            <AppleContinue onPress={() => void enableApple()} />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={CONTINUE_WITHOUT_ACCOUNT}
            onPress={() => void backup.enableAnonymous()}
            style={styles.centerAction}
          >
            <Text style={[theme.text.labelSmall, { color: theme.color.text.primary }]}>{CONTINUE_WITHOUT_ACCOUNT}</Text>
          </Pressable>
          <PrivacyLink />
        </View>
      ) : null}

      {view === 'anonymous' ? (
        <View style={{ marginTop: theme.space['6'] }}>
          <Text style={[theme.text.body, { color: theme.color.text.primary }]}>{ANONYMOUS_LIMIT}</Text>
          <Text style={[theme.text.label, { color: theme.color.text.primary, marginTop: theme.space['6'] }]}>
            {LINK_APPLE_LABEL}
          </Text>
          <View style={{ marginTop: theme.space['2'] }}>
            <AppleContinue onPress={() => void linkApple()} />
          </View>
        </View>
      ) : null}

      {view === 'keyMissing' ? (
        <View style={{ marginTop: theme.space['3'] }}>
          <Text style={[theme.text.bodySmall, { color: theme.color.text.secondary }]}>{KEY_MISSING_BODY}</Text>
          <Button
            title={TRY_AGAIN}
            variant="secondary"
            onPress={() => undefined}
            style={{ alignSelf: 'flex-start', width: 'auto', marginTop: theme.space['6'] }}
          />
          <TextAction title={START_NEW_BACKUP} onPress={askNewCopy} style={{ marginTop: theme.space['6'] }} />
          <TextAction title={TURN_OFF} onPress={askTurnOff} style={{ marginTop: theme.space['8'] }} />
          <Text style={[theme.text.bodySmall, { color: theme.color.text.secondary, marginTop: theme.space['6'] }]}>
            {ACCOUNT_APPLE}
          </Text>
        </View>
      ) : null}

      {view === 'stale' ? (
        <Button
          title={TRY_AGAIN}
          variant="secondary"
          onPress={() => undefined}
          style={{ alignSelf: 'flex-start', width: 'auto', marginTop: theme.space['4'] }}
        />
      ) : null}

      {showOnActions || view === 'anonymous' ? (
        <View style={{ marginTop: showOnActions && view !== 'stale' ? theme.space['10'] : theme.space['8'] }}>
          <TextAction title={TURN_OFF} onPress={askTurnOff} />
          <TextAction title={DELETE_ACCOUNT} destructive onPress={() => void askDelete()} style={{ marginTop: theme.space['8'] }} />
          {view !== 'anonymous' ? (
            <Text style={[theme.text.caption, { color: theme.color.text.tertiary, marginTop: theme.space['6'] }]}>
              {APPLE_HELP}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}

function AppleContinue({ onPress }: { onPress: () => void }) {
  const { theme } = useTheme();
  const [available, setAvailable] = useState(Platform.OS === 'ios');

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AppleAuthentication.isAvailableAsync()
      .then(setAvailable)
      .catch(() => setAvailable(false));
  }, []);

  if (Platform.OS !== 'ios' || !available) return null;

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
      buttonStyle={
        theme.name === 'dark'
          ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
          : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
      }
      cornerRadius={theme.radius.pill}
      style={{ width: '100%', height: theme.size.button.comfort }}
      onPress={onPress}
    />
  );
}

function PrivacyLink() {
  const { theme } = useTheme();
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={PRIVACY}
      style={[styles.privacy, { gap: theme.space['2'], marginTop: theme.space['6'] }]}
    >
      <Text style={[theme.text.bodySmall, { color: theme.color.text.secondary }]}>{PRIVACY}</Text>
      <Icon name="chevronRight" size={16} color={theme.color.text.tertiary} />
    </View>
  );
}

function TextAction({
  title,
  onPress,
  destructive,
  style,
}: {
  title: string;
  onPress: () => void;
  destructive?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={[styles.textAction, style]}>
      <Text style={[theme.text.label, { color: destructive ? theme.color.text.destructive : theme.color.text.primary }]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 140 },
  back: { minHeight: 44, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  beta: { paddingVertical: 2 },
  centerAction: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  privacy: { minHeight: 44, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  textAction: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
});
