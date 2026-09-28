import { requireOptionalNativeModule } from 'expo';
import * as ExpoLinking from 'expo-linking';
import { router } from 'expo-router';
import * as React from 'react';
import { Linking, Platform } from 'react-native';
import {
  parseQuery,
  parseSelfTestParams,
  SELFTEST_AUTORUN,
  SELFTEST_ENABLED,
  selftestLog,
  setProgressUrl,
  startSelfTest,
} from './selftest';

// Long enough for CI to answer "app booted" with a deep link, which then wins.
const AUTORUN_DELAY_MS = 15_000;

/**
 * Mounted at the root of self-test builds only. Says "booted" on the self-test's
 * side channel (and which links reached the app), and, in a build carrying
 * EXPO_PUBLIC_MESH_SELFTEST_AUTORUN, starts the self-test itself when no deep
 * link has within a few seconds — so a run does not hinge on link delivery.
 */
export function MeshSelfTestBoot() {
  React.useEffect(() => {
    if (!SELFTEST_ENABLED) return;
    const autorun = SELFTEST_AUTORUN ? parseSelfTestParams(parseQuery(SELFTEST_AUTORUN)) : null;
    setProgressUrl(autorun?.progress);
    selftestLog(`app booted (autorun ${autorun ? 'set' : 'unset'})`);
    // The launch URL from where Expo Router takes it: expo-linking's registry
    // on iOS (React Native's getInitialURL reads the bridge's launch options,
    // and a bridgeless app has no bridge), React Native's elsewhere.
    const initial =
      Platform.OS === 'ios' ? Promise.resolve(ExpoLinking.getLinkingURL()) : Linking.getInitialURL();
    initial
      .then((url) => selftestLog(`initial url: ${url ?? 'none'}`))
      .catch((error) => selftestLog(`initial url failed: ${String(error)}`));
    // Links to the running app, as Expo Router hears them (React Native's event)…
    const sub = Linking.addEventListener('url', ({ url }) => selftestLog(`url event: ${url}`));
    // …and as the native app delegate received them (expo-linking), to tell a
    // link that never reached the app from one that stopped short of JS.
    const nativeSub = requireOptionalNativeModule<any>('ExpoLinking')?.addListener?.(
      'onURLReceived',
      (event: { url?: string }) => selftestLog(`native url: ${event?.url}`),
    );
    const timer = autorun
      ? setTimeout(() => {
          if (!startSelfTest(autorun, 'autorun')) return;
          try {
            router.push('/mesh-selftest');
          } catch (error) {
            selftestLog(`could not show the self-test screen: ${String(error)}`);
          }
        }, AUTORUN_DELAY_MS)
      : undefined;
    return () => {
      sub.remove();
      nativeSub?.remove?.();
      if (timer) clearTimeout(timer);
    };
  }, []);
  return null;
}
