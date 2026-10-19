/**
 * Build flags. End-user and TestFlight builds keep these false.
 * `sluketAnimation` stays off until the splash worklet crash is fixed.
 * Turning it on loads src/components/SluketPlay.tsx, which is not evaluated while this is false.
 */
export const features = {
  sluketAnimation: false,
} as const;
