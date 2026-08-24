import { describe, reportError } from './errorLog';

/**
 * Routes the failures a React error boundary structurally cannot see into the
 * error log.
 *
 * `app/_layout.tsx` already re-exports expo-router's `ErrorBoundary`, which
 * catches throws during render — that is what produced the red screen. It never
 * sees anything asynchronous: a rejected promise, a callback that throws, a
 * `console.error` from a library. Those are the ones that look like "it just
 * doesn't work".
 */

type GlobalErrorHandler = (error: unknown, isFatal?: boolean) => void;

type ErrorUtilsShape = {
  getGlobalHandler?: () => GlobalErrorHandler;
  setGlobalHandler?: (handler: GlobalErrorHandler) => void;
};

/* On `globalThis` rather than in module scope: Fast Refresh re-evaluates the
 * module on every save, which would reset a module-level flag and wrap
 * `console.error` again on top of the previous wrapper. */
const INSTALLED = '__pokketErrorHandlersInstalled';

/** Safe to call more than once; Fast Refresh will. */
export const installGlobalErrorHandlers = () => {
  const scope = globalThis as Record<string, unknown>;
  if (scope[INSTALLED]) return;
  scope[INSTALLED] = true;

  installUncaughtHandler();
  installRejectionTracker();
  installConsoleMirror();
};

/** Uncaught throws outside of render — timers, event handlers, native callbacks. */
const installUncaughtHandler = () => {
  const errorUtils = (globalThis as { ErrorUtils?: ErrorUtilsShape }).ErrorUtils;
  const previous = errorUtils?.getGlobalHandler?.();
  if (!errorUtils?.setGlobalHandler) return;

  errorUtils.setGlobalHandler((error, isFatal) => {
    reportError(
      'js',
      `${isFatal ? 'Fatal' : 'Uncaught'}: ${describe(error)}`,
      error instanceof Error ? error.stack : undefined,
    );
    // Chained, not replaced: RN's own handler is what shows LogBox and reports
    // the crash natively, and swallowing it would trade one silence for another.
    previous?.(error, isFatal);
  });
};

/**
 * On Hermes, rejections are reported through a tracker that React Native only
 * installs in `__DEV__`, and installing our own replaces theirs — so this
 * forwards to their options object rather than dropping it.
 */
const installRejectionTracker = () => {
  const hermes = (globalThis as {
    HermesInternal?: { enablePromiseRejectionTracker?: (options: unknown) => void };
  }).HermesInternal;
  if (!hermes?.enablePromiseRejectionTracker) return;

  let defaults: { onUnhandled?: (id: number, rejection: unknown) => void; onHandled?: (id: number) => void } = {};
  try {
    // Deliberately dynamic: this is an internal React Native path that may not
    // exist, and a static import would take the bundle down with it.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    defaults = require('react-native/Libraries/promiseRejectionTrackingOptions').default ?? {};
  } catch {
    // Fine — we just lose LogBox's version of the same message.
  }

  try {
    hermes.enablePromiseRejectionTracker({
      allRejections: true,
      onUnhandled: (id: number, rejection: unknown) => {
        reportError(
          'promise',
          `Unhandled rejection: ${describe(rejection)}`,
          rejection instanceof Error ? rejection.stack : undefined,
        );
        defaults.onUnhandled?.(id, rejection);
      },
      onHandled: (id: number) => defaults.onHandled?.(id),
    });
  } catch {
    // Not worth taking the app down over a debugging aid.
  }
};

/**
 * Mirrors `console.error`, which is where most libraries — Apollo included —
 * announce a problem they have already handled internally.
 */
const installConsoleMirror = () => {
  const original = console.error;
  let reentrant = false;

  console.error = (...args: unknown[]) => {
    // A render triggered by `reportError` can itself `console.error`; without
    // this the two feed each other until the stack gives out.
    if (!reentrant) {
      reentrant = true;
      try {
        const [first, ...rest] = args;
        reportError(
          'console',
          describe(first),
          rest.length > 0 ? rest.map(describe).join('\n') : undefined,
        );
      } finally {
        reentrant = false;
      }
    }
    original(...args);
  };
};
