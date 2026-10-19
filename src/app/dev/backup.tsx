import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';

import { currentBackupUser, signInAnonymously, signInWithApple, signOutOfBackup } from '@/auth/backupAuth';
import { features } from '@/config/features';
import { runSync } from '@/sync/runSync';

/**
 * Engineer-only entry. Not linked from Deg, onboarding, or launch.
 * The product entry, when design specs it, is Deg → Sikkerhetskopi.
 */
export default function DevBackupRoute() {
  if (!__DEV__) return <Redirect href="/" />;
  return <DevBackupConsole />;
}

function DevBackupConsole() {
  const [message, setMessage] = useState(
    features.backendSync ? 'Sync is on. Signed out until you choose an account.' : 'Sync is off. This phone stays local-only.',
  );
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (work: () => Promise<string>) => {
    setBusy(true);
    try {
      setMessage(await work());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <View style={styles.screen}>
      <Text style={styles.kicker}>Dev only</Text>
      <Text style={styles.title}>Sikkerhetskopi</Text>
      <Text style={styles.body}>
        This is not the product screen. The future opt-in lives on Deg. Onboarding and first launch never sign anyone in.
      </Text>
      <Text style={styles.message}>{message}</Text>
      <DevButton
        label="Sign in with Apple"
        disabled={busy || !features.backendSync}
        onPress={() =>
          run(async () => {
            const result = await signInWithApple();
            return result.status === 'cancelled' ? 'Apple sign-in cancelled' : `Signed in ${result.userId}`;
          })
        }
      />
      <DevButton
        label="Continue without an account"
        disabled={busy || !features.backendSync}
        onPress={() =>
          run(async () => {
            const result = await signInAnonymously();
            return `Anonymous session ${result.userId}`;
          })
        }
      />
      <DevButton
        label="Sync now"
        disabled={busy || !features.backendSync}
        onPress={() =>
          run(async () => {
            const result = await runSync();
            return JSON.stringify(result);
          })
        }
      />
      <DevButton
        label="Sign out"
        disabled={busy || !features.backendSync}
        onPress={() =>
          run(async () => {
            await signOutOfBackup();
            const user = await currentBackupUser().catch(() => null);
            return user ? `Still signed in ${user.userId}` : 'Signed out. Sessions on this phone were kept.';
          })
        }
      />
    </View>
  );
}

function DevButton({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={styles.button}>
      <Text style={[styles.buttonLabel, disabled ? styles.disabled : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, paddingTop: 72, gap: 12, backgroundColor: '#F0EDE7' },
  kicker: { fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  title: { fontSize: 32 },
  body: { fontSize: 16, lineHeight: 22 },
  message: { fontSize: 14, lineHeight: 20, marginVertical: 8 },
  button: { paddingVertical: 12 },
  buttonLabel: { fontSize: 16 },
  disabled: { opacity: 0.4 },
});
