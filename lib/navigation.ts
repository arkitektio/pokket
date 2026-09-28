import { router } from "expo-router";

/**
 * Show a module page in the page view, as the rail does in orkestrator: it
 * replaces what the tab shows (from the root of the stack), rather than
 * piling pages on a back stack. Details — a thread, a transaction — are
 * pushed over a page instead, with a way back.
 */
export const showPage = (route: string) => {
  if (router.canDismiss()) router.dismissAll();
  router.replace(route as never);
};

/** Push a detail over the page on show. */
export const showDetail = (route: string) => {
  router.push(route as never);
};
