import { router } from "expo-router";

/**
 * Show a module page in the page view, as the rail does in orkestrator: it
 * replaces what the tab shows (from the root of its stack), rather than
 * piling pages on a back stack. Details — a thread, a transaction — are
 * pushed over a page instead, with a way back.
 *
 * Both act on the navigator that has focus, so both must run from inside the
 * app frame. From a screen over it (search) use `afterReturningToApp`.
 */
export const showPage = (route: string) => {
  // Only unwind when something is pushed: each action is its own render.
  if (router.canDismiss()) router.dismissAll();
  router.replace(route as never);
};

/** Push a detail over the page on show. */
export const showDetail = (route: string) => {
  router.push(route as never);
};

let pending: (() => void) | null = null;

/**
 * Close the screen on top (search) and, once the app frame has focus again,
 * run `then` there. Navigating from the closing screen itself would act on
 * the ROOT stack — a `replace` there swaps the search for a second copy of the
 * whole app, which is what broke "back" and kept stacking up mounted frames.
 */
export const afterReturningToApp = (then: () => void) => {
  pending = then;
  router.back();
};

/** Called by the app frame when it (re)gains focus. */
export const runPendingNavigation = () => {
  const next = pending;
  pending = null;
  next?.();
};
