import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

import { getSupabase } from '@/lib/supabase';

export type BackupUser = {
  userId: string;
  anonymous: boolean;
};

/**
 * Opt-in backup identity. Nothing in onboarding or launch calls this.
 * The future entry is Deg → Sikkerhetskopi. Sign-out leaves the on-device database as it is.
 */

function randomNonce(byteCount = 32): string {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const bytes = Crypto.getRandomBytes(byteCount);
  let nonce = '';
  for (const byte of bytes) nonce += alphabet[byte % alphabet.length];
  return nonce;
}

function isAppleCancel(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ERR_REQUEST_CANCELED';
}

export async function currentBackupUser(): Promise<BackupUser | null> {
  const { data, error } = await getSupabase().auth.getSession();
  if (error) throw error;
  const user = data.session?.user;
  if (!user) return null;
  return { userId: user.id, anonymous: user.is_anonymous === true };
}

/** Primary sign-in. iOS only. Apple returns the person's name on the first grant; it is stored on the auth user, not in the local profile. */
export async function signInWithApple(): Promise<{ status: 'signed-in'; userId: string } | { status: 'cancelled' }> {
  if (Platform.OS !== 'ios') throw new Error('Sign in with Apple is only available on iOS');
  const available = await AppleAuthentication.isAvailableAsync();
  if (!available) throw new Error('Sign in with Apple is not available on this device');

  const rawNonce = randomNonce();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce, {
    encoding: Crypto.CryptoEncoding.HEX,
  });

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
    if (!credential.identityToken) throw new Error('Apple did not return an identity token');
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
      nonce: rawNonce,
    });
    if (error) throw error;
    const userId = data.user?.id;
    if (!userId) throw new Error('Supabase did not return a user');

    const given = credential.fullName?.givenName ?? undefined;
    const family = credential.fullName?.familyName ?? undefined;
    if (given || family) {
      // The session is already valid. A failed name write should not look like a failed sign-in.
      await supabase.auth.updateUser({
        data: {
          full_name: [given, family].filter(Boolean).join(' '),
          given_name: given ?? null,
          family_name: family ?? null,
        },
      });
    }
    return { status: 'signed-in', userId };
  } catch (error) {
    if (isAppleCancel(error)) return { status: 'cancelled' };
    throw error;
  }
}

/** Optional fallback so a backup can start without an Apple account. Never called on launch. */
export async function signInAnonymously(): Promise<{ userId: string }> {
  const { data, error } = await getSupabase().auth.signInAnonymously();
  if (error) throw error;
  const userId = data.user?.id;
  if (!userId) throw new Error('Supabase did not return a user');
  return { userId };
}

export async function signOutOfBackup(): Promise<void> {
  const { error } = await getSupabase().auth.signOut();
  if (error) throw error;
}
