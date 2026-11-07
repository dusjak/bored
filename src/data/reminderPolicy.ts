export const DAILY_REMINDER_ID = 'bored.daily-reminder';

/**
 * The Deg switch is on only when the stored choice and the system permission agree.
 * A stored "on" with a denied or unknown permission is shown off.
 */
export function reminderIsOn(stored: boolean | undefined, permissionGranted: boolean): boolean {
  return stored === true && permissionGranted;
}

/**
 * Ask iOS only the first time. A later denial is not prompted again;
 * the row points at Innstillinger instead.
 */
export function shouldAskNotificationPermission(status: string): boolean {
  return status === 'undetermined';
}

/** One daily trigger, one identifier. Not an interval and not a second alert. */
export function dailyReminderSpec(hour: number, minute: number): {
  identifier: string;
  repeats: 'daily';
  hour: number;
  minute: number;
} {
  return { identifier: DAILY_REMINDER_ID, repeats: 'daily', hour, minute };
}
