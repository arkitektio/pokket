import { useCallback, useState } from "react";

import { App } from "@/lib/app/App";
import {
  buildProvisioningBlob,
  stageDeviceAuthorization,
  type BleDeviceManifest,
  type DeviceProvisioningBlob,
} from "@/lib/arkitekt/fakts/provisionDevice";
import {
  useAcceptDeviceCodeMutation,
  useDeviceCodeByCodeLazyQuery,
} from "@/lib/lok/deviceCode";

export type EnrollDeviceOptions = {
  /** The manifest read from the device's BLE `MANIFEST` characteristic. */
  manifest: BleDeviceManifest;
  /** The hub the device is being enrolled into. */
  hubId: string;
  /** Name for a device row created by this enrolment. Ignored if it exists. */
  deviceName?: string;
  /** Optional requirement keys the operator chose not to grant. */
  declinedRequirements?: string[];
};

export type UseDeviceEnrollmentResult = {
  enrolling: boolean;
  status: string | null;
  enrollDevice: (
    options: EnrollDeviceOptions,
  ) => Promise<DeviceProvisioningBlob>;
};

/**
 * Enroll a device on its behalf and return what it needs to finish the job.
 *
 * Pokket stages an RFC 8628 authorization using the *device's* manifest, then
 * approves it as the signed-in operator. The device code that comes back has
 * therefore already been granted, so the device's own exchange returns tokens
 * on the first try instead of polling for a human — which is what makes this
 * work over a link that closes as soon as we walk away.
 *
 * The user code never leaves Pokket: it is the proof-of-possession the accept
 * mutation requires, not something the device needs.
 */
export function useDeviceEnrollment(): UseDeviceEnrollmentResult {
  const [enrolling, setEnrolling] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const endpoint = App.useEndpoint();
  const [resolveDeviceCode] = useDeviceCodeByCodeLazyQuery();
  const [acceptDeviceCode] = useAcceptDeviceCodeMutation();

  const enrollDevice = useCallback(
    async ({
      manifest,
      hubId,
      deviceName,
      declinedRequirements = [],
    }: EnrollDeviceOptions): Promise<DeviceProvisioningBlob> => {
      if (!endpoint) {
        throw new Error(
          "Not connected to Arkitekt. Connect before provisioning a device.",
        );
      }

      setEnrolling(true);
      const controller = new AbortController();

      try {
        setStatus("Registering device with Arkitekt...");
        const authorization = await stageDeviceAuthorization({
          endpoint,
          controller,
          manifest,
        });

        // The staged code is not reachable by id until it has been accepted,
        // so the user code we were just handed is how we find it.
        setStatus("Locating enrolment request...");
        const resolved = await resolveDeviceCode({
          variables: { deviceCode: authorization.user_code },
          fetchPolicy: "network-only",
        });

        const staged = resolved.data?.deviceCodeByCode;
        if (!staged) {
          throw new Error(
            resolved.error?.message ??
              "Arkitekt did not return the staged enrolment request",
          );
        }

        setStatus("Approving device...");
        const accepted = await acceptDeviceCode({
          variables: {
            input: {
              deviceCode: staged.id,
              code: authorization.user_code,
              hub: hubId,
              deviceName: deviceName ?? null,
              declinedRequirements,
            },
          },
        });

        if (!accepted.data?.acceptDeviceCode?.id) {
          throw new Error("Arkitekt refused to approve the device");
        }

        setStatus("Device approved");
        return buildProvisioningBlob({ endpoint, authorization });
      } finally {
        setEnrolling(false);
      }
    },
    [endpoint, resolveDeviceCode, acceptDeviceCode],
  );

  return { enrolling, status, enrollDevice };
}
