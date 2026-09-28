import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import * as React from 'react';

export type UpdateCheck =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'current' }
  | { kind: 'downloaded' }
  | { kind: 'unavailable'; reason: string }
  | { kind: 'error'; message: string };

/**
 * What is running, for Settings: the app's version, and which update of
 * which channel — plus a manual "check now".
 */
export const useUpdateInfo = () => {
  const [check, setCheck] = React.useState<UpdateCheck>({ kind: 'idle' });

  const info = {
    version: Constants.expoConfig?.version ?? 'unknown',
    channel: Updates.channel ?? null,
    runtimeVersion: Updates.runtimeVersion ?? null,
    /** The update's id, or null when running the JS the binary shipped with. */
    updateId: Updates.isEmbeddedLaunch ? null : Updates.updateId,
    updatedAt: Updates.isEmbeddedLaunch ? null : Updates.createdAt,
  };

  const checkNow = React.useCallback(async () => {
    if (__DEV__) {
      setCheck({ kind: 'unavailable', reason: 'Development builds load their JS from Metro.' });
      return;
    }
    if (!Updates.isEnabled) {
      setCheck({ kind: 'unavailable', reason: 'This build does not receive updates.' });
      return;
    }
    setCheck({ kind: 'checking' });
    try {
      const result = await Updates.checkForUpdateAsync();
      if (!result.isAvailable) {
        setCheck({ kind: 'current' });
        return;
      }
      await Updates.fetchUpdateAsync();
      setCheck({ kind: 'downloaded' });
    } catch (error) {
      setCheck({ kind: 'error', message: error instanceof Error ? error.message : String(error) });
    }
  }, []);

  return { info, check, checkNow, restart: () => Updates.reloadAsync() };
};
