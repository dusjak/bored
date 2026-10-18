import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

/**
 * Local notification fired when a session reaches 00:00 while the app is away.
 * No custom sound: the iOS default alert.
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

/** Ask before the session clock starts, so the system dialog does not eat into the session. */
export async function ensureSessionNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === 'granted') return true;
  if (existing.status === 'denied') return false;
  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return requested.status === 'granted';
}

export async function scheduleSessionEndNotification(endsAt: Date): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (endsAt.getTime() <= Date.now() + 500) return null;
  const allowed = await ensureSessionNotificationPermission();
  if (!allowed) return null;

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

export async function cancelSessionNotification(id: string | null): Promise<void> {
  if (!id || Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
  await Notifications.dismissNotificationAsync(id).catch(() => undefined);
}
