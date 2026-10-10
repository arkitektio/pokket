import { router } from "expo-router";
import { pathOf, queryOf, routeOf } from "./modules/catalog";

/** One spelling per route (params sorted), so two can be compared. */
const spelled = (route: string) => routeOf(pathOf(route), queryOf(route));

let onShow: string | null = null;

/** Told by the page view on every navigation: the route it shows now. */
export const setPageOnShow = (route: string) => {
  onShow = spelled(route);
};

/**
 * Show a module page in the page view: the sidebar, search and links between
 * pages. It is a step in the page view's history, like a detail pushed over a
 * page, so back returns to where one came from. Choosing the page already on
 * show does nothing.
 *
 * Acts on the navigator that has focus, as `showDetail` and `replacePage` do,
 * so all three must run from inside the app frame. From a screen over it
 * (search) use `afterReturningToApp`.
 */
export const showPage = (route: string) => {
  if (spelled(route) === onShow) return;
  router.push(route as never);
};

/**
 * Leave the page on show for good and show another from the root of the
 * stack: the page left behind is gone (a deleted room), so back must not
 * return to it.
 */
export const replacePage = (route: string) => {
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
