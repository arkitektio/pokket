import { afterReturningToApp, showDetail } from "@/lib/navigation";

import { callRoute } from "./links";

/**
 * Put a call's page on screen from anywhere, the bar and the toasts
 * included: they sit over the whole app, and from a screen over the app
 * frame (search) a navigation would land in the root stack, so that one is
 * left first. `pathname` is where the member is now.
 */
export const showCall = (id: string, pathname: string) => {
  const route = callRoute(id);
  if (pathname === route) return;
  if (pathname === "/search") afterReturningToApp(() => showDetail(route));
  else showDetail(route);
};
