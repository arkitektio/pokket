import type { ApolloClient } from "@apollo/client";
import * as React from "react";
import { useService } from "@/lib/arkitekt/hooks";
import { useDatalayer } from "@/lib/datalayer/useDatalayer";
import { mediaUrl } from "./access";

export const useMikroClient = (): ApolloClient<any> => useService("mikro").client as ApolloClient<any>;

/**
 * The url of a media object, or null while it is being signed, when there is
 * no object, or when the deployment has no datalayer. Callers draw their
 * fallback for null.
 */
export const useMediaUrl = (media: { key: string } | null | undefined): string | null => {
  const client = useMikroClient();
  const datalayer = useDatalayer();
  const key = media?.key;
  const [url, setUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    setUrl(null);
    if (!key || !datalayer) return;
    let live = true;
    mediaUrl({ key }, client, datalayer)
      .then((signed) => live && setUrl(signed))
      .catch((e) => console.warn("[mikro] could not sign a media url", e));
    return () => {
      live = false;
    };
  }, [key, client, datalayer]);

  return url;
};
