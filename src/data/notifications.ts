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
