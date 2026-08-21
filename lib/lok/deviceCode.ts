import { gql } from "@apollo/client";

import { useLazyQuery, useMutation, useQuery } from "./funcs";

/**
 * Device-code operations against lok's management schema.
 *
 * These are hand-written rather than generated: `codegen` pulls its schema from
 * a live deployment (`lok.yml`), and the checked-in `api/graphql.ts` predates
 * the protocol-2 schema, so it carries no types for them. The matching
 * documents live in `graphql/lok/**` so a codegen run picks them up, and this
 * module can be deleted once it does.
 */

export type Hub = {
  id: string;
  name: string;
  description: string | null;
  organization: { id: string; slug: string };
};

export type HubsQuery = { hubs: Hub[] };

export const HubsDocument = gql`
  query Hubs {
    hubs {
      id
      name
      description
      organization {
        id
        slug
      }
    }
  }
`;

export const useHubsQuery = () => useQuery<HubsQuery>(HubsDocument);

export type DeviceCodeByCodeQuery = {
  deviceCodeByCode: {
    id: string;
    code: string;
    expiresAt: string;
    denied: boolean;
  };
};

export type DeviceCodeByCodeVariables = { deviceCode: string };

/**
 * Resolve a staged code to its id.
 *
 * A pending device code has no organization yet, so it is deliberately not
 * reachable by id — the user code the device displayed is the capability that
 * reaches it, and `acceptDeviceCode` then requires that same code back as
 * proof of possession.
 */
export const DeviceCodeByCodeDocument = gql`
  query DeviceCodeByCode($deviceCode: String!) {
    deviceCodeByCode(deviceCode: $deviceCode) {
      id
      code
      expiresAt
      denied
    }
  }
`;

export const useDeviceCodeByCodeLazyQuery = () =>
  useLazyQuery<DeviceCodeByCodeQuery, DeviceCodeByCodeVariables>(
    DeviceCodeByCodeDocument,
  );

export type AcceptDeviceCodeInput = {
  deviceCode: string;
  /** The user code the device displayed — proof the approver saw the request. */
  code: string;
  hub: string;
  deviceName?: string | null;
  declinedRequirements?: string[];
};

export type AcceptDeviceCodeMutation = { acceptDeviceCode: { id: string } };

export type AcceptDeviceCodeVariables = { input: AcceptDeviceCodeInput };

export const AcceptDeviceCodeDocument = gql`
  mutation AcceptDeviceCode($input: AcceptDeviceCodeInput!) {
    acceptDeviceCode(input: $input) {
      id
    }
  }
`;

export const useAcceptDeviceCodeMutation = () =>
  useMutation<AcceptDeviceCodeMutation, AcceptDeviceCodeVariables>(
    AcceptDeviceCodeDocument,
  );
