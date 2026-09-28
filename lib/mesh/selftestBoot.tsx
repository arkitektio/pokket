import { router } from 'expo-router';
import * as React from 'react';
import { Linking } from 'react-native';
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
    Linking.getInitialURL()
      .then((url) => selftestLog(`initial url: ${url ?? 'none'}`))
      .catch((error) => selftestLog(`initial url failed: ${String(error)}`));
    const sub = Linking.addEventListener('url', ({ url }) => selftestLog(`url event: ${url}`));
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
      if (timer) clearTimeout(timer);
    };
  }, []);
  return null;
}
