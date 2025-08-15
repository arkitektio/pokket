import { FaktsEndpoint } from "./endpointSchema";

export interface Closable {
  close: () => Promise<void>;
}

export interface Popper {
  open: (url: string) => Closable;
}

export const popOutWindowOpen = async ({
  endpoint,
  code,
  popper
}: {
  endpoint: FaktsEndpoint;
  code: string;
  popper: Popper;
}): Promise<Closable> => {
  const url = `${endpoint.base_url}configure/?device_code=${code}&grant=device_code`;

  const closable = popper.open(url);
  if (!closable) throw new Error("Could not pop window");

  return {
    close: async () => {
      try {
        closable.close?.();
      } catch (e) {
        console.error("Popping close failed", e);
      }
    },
  };
};
