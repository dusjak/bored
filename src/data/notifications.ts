import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

/**
 * Local notification fired when a session reaches 00:00 while the app is away.
 * Scheduled only when permission is already granted. This module never asks
 * for a push token. Expo Go does not support getExpoPushTokenAsync.
 * No custom sound: the iOS default alert, which is the system sound and haptic.
 * In Expo Go the alert is delivered by Expo Go, not by a standalone bored. binary.
 *
 * Nothing here runs at import time. The handler is installed on first use, and
 * every call swallows failures so a notifications error cannot take down launch.
 */

let handlerReady = false;

function ensureNotificationHandler(): void {
  if (handlerReady || Platform.OS === 'web') return;
  handlerReady = true;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {
    // Expo Go logs a warning for remote push. Local alerts still schedule.
  }
}

export async function hasNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    ensureNotificationHandler();
    const existing = await Notifications.getPermissionsAsync();
    return existing.status === 'granted';
  } catch {
    return false;
  }
}

export async function scheduleSessionEndNotification(endsAt: Date): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (endsAt.getTime() <= Date.now() + 500) return null;
  try {
    if (!(await hasNotificationPermission())) return null;
    return await Notifications.scheduleNotificationAsync({
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
  } catch {
    return null;
  }
}

/** Drops a pending alert. Does not remove one already delivered. */
export async function cancelSessionNotification(id: string | null): Promise<void> {
  if (!id || Platform.OS === 'web') return;
  try {
    ensureNotificationHandler();
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // A missing alert is not a launch failure.
  }
}

/** Removes a delivered alert, used when the user ends the session by holding. */
export async function dismissSessionNotification(id: string | null): Promise<void> {
  if (!id || Platform.OS === 'web') return;
  try {
    ensureNotificationHandler();
    await Notifications.dismissNotificationAsync(id);
  } catch {
    // Already gone.
  }
}

/** Asks the system. Used only when the user turns Daglig påminnelse on, never at session start. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    ensureNotificationHandler();
    const existing = await Notifications.getPermissionsAsync();
    if (existing.status === 'granted') return true;
    const requested = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    });
    return requested.status === 'granted';
  } catch {
    return false;
  }
}

const DAILY_REMINDER_ID = 'bored.daily-reminder';

export async function scheduleDailyReminder(hour: number, minute: number): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    ensureNotificationHandler();
    await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID);
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
  } catch {
    // Leave the app usable if Expo Go refuses the schedule.
  }
}

export async function cancelDailyReminder(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    ensureNotificationHandler();
    await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID);
  } catch {
    // Already gone.
  }
}

/** Drops every pending local alert. Does not change the system permission. */
export async function cancelAllScheduledNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    ensureNotificationHandler();
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // Reset still continues.
  }
}
