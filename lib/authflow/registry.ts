import { usePotentialService } from "@/lib/arkitekt/hooks";
import { BANK_AUTH_FLOW } from "@/lib/bank/authFlow";
import { KUVERT_AUTH_FLOW } from "@/lib/kuvert/authFlow";
import type { ApolloClient } from "@apollo/client";
import type { AuthFlowHandler } from "./types";

/**
 * Every service whose logins the phone carries, by the namespace the relay
 * names it with (`orkestrator://<namespace>/auth/callback`).
 */
export const AUTH_FLOWS: Record<string, AuthFlowHandler> = {
  bank: BANK_AUTH_FLOW,
  kuvert: KUVERT_AUTH_FLOW,
};

/** A service's client, or undefined while it is not connected (`useService` throws instead). */
export const useServiceClient = (service: string | undefined): ApolloClient<any> | undefined =>
  usePotentialService(service ?? "")?.client as ApolloClient<any> | undefined;
