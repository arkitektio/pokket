import { WindowPopper } from "../types";

export interface Closable {
  close: () => Promise<void>;
}

/**
 * Open the deployment's configure page so a human can approve the device code.
 * The URL is `verification_uri_complete` straight from the authorization
 * response — the server builds it from its own configure template, so a
 * deployment can relocate the page without us knowing.
 */
export const popOutWindowOpen = async ({
  verificationUri,
  windowPopper,
}: {
  verificationUri: string;
  windowPopper: WindowPopper;
}): Promise<Closable> => {
  const win = windowPopper.open(verificationUri);

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
