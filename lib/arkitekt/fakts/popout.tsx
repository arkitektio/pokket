import { WindowPopper } from "../types";
import { FaktsEndpoint } from "./endpointSchema";

export interface Closable {
  close: () => Promise<void>;
}

export const popOutWindowOpen = async ({
  endpoint,
  code,
  windowPopper,
}: {
  endpoint: FaktsEndpoint;
  code: string;
  windowPopper: WindowPopper;
}): Promise<Closable> => {
  const url = `${endpoint.frontend_url}configure/${code}`;

  const win = windowPopper.open(url);

  if (!win) throw new Error("Could not open window");

  return {
    close: async () => {
      try {
        win.close?.();
      } catch (e) {
        console.error("Window close failed", e);
      }
    },
  };
};
