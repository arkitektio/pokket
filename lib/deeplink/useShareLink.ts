import * as React from "react";
import { Platform, Share } from "react-native";
import { toast } from "sonner-native";
import { App } from "../app/App";
import { profileScope } from "./shareScope";
import { privateLinkFor, shareLinkFor } from "./universalLink";

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
 * "Share this page" — orkestrator's `useCopyUniversalLink`. `share` belongs
 * to the live organization, since the same path elsewhere opens something
 * else (`shareLinkFor`). `sharePrivate` is a link with the deployment and organization
 * hashed away, for pasting somewhere public: only an app already signed in to
 * the organization can follow it.
 */
export const useShareLink = (route: string) => {
  const active = App.useActiveProfile();
  return React.useMemo(() => {
    const scope = active ? profileScope(active) : null;
    const attempt = (work: () => Promise<void>) => {
      // Building the link can throw before there is a promise to catch.
      Promise.resolve()
        .then(work)
        .catch((error: Error) => toast.error(`Could not share the link: ${error.message}`));
    };
    return {
      share: () => attempt(() => hand(shareLinkFor(route, active), "Link copied")),
      sharePrivate: () =>
        attempt(async () => {
          if (!scope) throw new Error("sign in to an organization first");
          await hand(await privateLinkFor(route, scope), "Private link copied");
        }),
    };
  }, [active, route]);
};
