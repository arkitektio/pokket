import * as React from "react";
import { App } from "../app/App";
import { aliasToHttpPath } from "../arkitekt/alias/helpers";
import type { DatalayerClient } from "./service";

export type DatalayerEndpoint = {
  /** The store's own address: what object urls are signed for. */
  own: string;
  /** Where it is reached from this phone; differs from `own` on the mesh. */
  reached: string;
};

/** The datalayer of the active connection, or null when the deployment has none. */
export const useDatalayer = (): DatalayerEndpoint | null => {
  const service = App.usePotentialService("datalayer");
  const own = App.useConnection()?.aliasMap?.datalayer;
  return React.useMemo(() => {
    const reached = (service?.client as DatalayerClient | undefined)?.url;
    if (!reached) return null;
    return { own: own ? aliasToHttpPath(own, "") : reached, reached };
  }, [service, own]);
};
