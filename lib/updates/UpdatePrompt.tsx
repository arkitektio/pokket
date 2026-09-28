import * as Updates from 'expo-updates';
import * as React from 'react';
import { AppState } from 'react-native';
import { toast } from 'sonner-native';

/** Checking more often than this on resume only costs requests. */
const RESUME_CHECK_EVERY_MS = 30 * 60 * 1000;

/**
 * Brings releases to running apps. expo-updates already checks at launch and
 * applies what it found on the next launch; this also checks when the app
 * comes back to the foreground, and once an update is downloaded offers to
 * restart into it now rather than at some later cold start.
 *
 * Inert in development (Metro serves the JS) and in builds without updates.
 */
export function UpdatePrompt() {
  const { isUpdatePending } = Updates.useUpdates();
  const lastCheck = React.useRef(Date.now());

  React.useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || Date.now() - lastCheck.current < RESUME_CHECK_EVERY_MS) return;
      lastCheck.current = Date.now();
      void Updates.checkForUpdateAsync()
        .then((result) => (result.isAvailable ? Updates.fetchUpdateAsync() : undefined))
        .catch((error) => console.warn('[updates] check failed:', error));
    });
    return () => subscription.remove();
  }, []);

  React.useEffect(() => {
    if (!isUpdatePending) return;
    toast('A new version of Pokket is ready', {
      duration: Infinity,
      action: { label: 'Restart', onClick: () => void Updates.reloadAsync() },
    });
  }, [isUpdatePending]);

  return null;
}
