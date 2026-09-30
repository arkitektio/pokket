import * as Device from "expo-device";

/** A DNS-safe node name, e.g. `pokket-pixel-8`. */
export const nodeHostname = (): string => {
  const device = (Device.deviceName || Device.modelName || "device")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `pokket-${device || "device"}`.slice(0, 63).replace(/-+$/, "");
};
