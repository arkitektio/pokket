import * as React from "react";
import { Platform, Share } from "react-native";
import { toast } from "sonner-native";
import { App } from "../app/App";
import { shareLinkFor } from "./universalLink";

/** Hand a link to the system's share sheet (which has "Copy"); on the web, to the clipboard. */
const hand = async (url: string, copied: string) => {
  if (Platform.OS === "web") {
    await navigator.clipboard.writeText(url);
    toast.success(copied);
    return;
  }
  await Share.share(Platform.OS === "ios" ? { url } : { message: url });
};

/**
 * "Share this page" — orkestrator's `useCopyUniversalLink`. The link belongs
 * to the live organization and goes through its front door (`shareLinkFor`);
 * when it cannot, sharing says why.
 */
export const useShareLink = (route: string) => {
  const active = App.useActiveProfile();
  return React.useMemo(
    () => ({
      share: () => {
        // Building the link can throw before there is a promise to catch.
        Promise.resolve()
          .then(() => hand(shareLinkFor(route, active), "Link copied"))
          .catch((error: Error) => toast.error(`Could not share the link: ${error.message}`));
      },
    }),
    [active, route],
  );
};
