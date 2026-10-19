import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

/**
 * Local notification fired when a session reaches 00:00 while the app is away.
 * Scheduled only when permission is already granted. This module never asks.
 * No custom sound: the iOS default alert, which is the system sound and haptic.
 * In Expo Go the alert is delivered by Expo Go, not by a standalone bored. binary.
 */
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function hasNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const existing = await Notifications.getPermissionsAsync();
  return existing.status === 'granted';
}

export async function scheduleSessionEndNotification(endsAt: Date): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (endsAt.getTime() <= Date.now() + 500) return null;
  if (!(await hasNotificationPermission())) return null;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'bored.',
      body: 'Økta er ferdig.',
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: endsAt,
    },
  });
}

/** Drops a pending alert. Does not remove one already delivered. */
export async function cancelSessionNotification(id: string | null): Promise<void> {
  if (!id || Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
}

/** Removes a delivered alert, used when the user ends the session by holding. */
export async function dismissSessionNotification(id: string | null): Promise<void> {
  if (!id || Platform.OS === 'web') return;
  await Notifications.dismissNotificationAsync(id).catch(() => undefined);
}

/** Asks the system. Used only when the user turns Daglig påminnelse on, never at session start. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === 'granted') return true;
  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return requested.status === 'granted';
}

const DAILY_REMINDER_ID = 'bored.daily-reminder';

export async function scheduleDailyReminder(hour: number, minute: number): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => undefined);
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: {
      title: 'bored.',
      body: 'Tid for ingenting.',
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function cancelDailyReminder(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => undefined);
}

/** Drops every pending local alert. Does not change the system permission. */
export async function cancelAllScheduledNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => undefined);
}
