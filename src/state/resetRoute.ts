/**
 * Where Nullstill leaves the user once the confirmations have succeeded.
 * `/log` is the existing journal list (the notes). Reflection stays the
 * per-session editor and is not opened without a session id.
 * Hjem is the screen Nullstill was wrongly falling through to.
 */
export const NOTES_AFTER_RESET = '/log' as const;

export function routeWhenSessionCleared(afterReset: boolean): '/log' | '/home' {
  return afterReset ? NOTES_AFTER_RESET : '/home';
}
