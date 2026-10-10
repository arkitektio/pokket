import type { ApolloClient } from "@apollo/client";
import { usePotentialService } from "../arkitekt/hooks";

/**
 * A search widget names the service to ask as its `ward`. These are the wards
 * pokket has a GraphQL client for; orkestrator also knows kabinet, fluss,
 * kraph, elektro and omero_ark, which pokket does not connect to.
 */
const WARDS: Record<string, string> = {
  rekuest: "rekuest",
  mikro: "mikro",
  alpaka: "alpaka",
  lovekit: "lovekit",
  kuvert: "kuvert",
  bank: "bank",
  lokate: "lokate",
};

export const wardService = (ward: string | null | undefined): string | null => (ward && WARDS[ward]) || null;

/** The client to run a ward's searches on, or undefined when pokket has none for it. */
export const useWardClient = (ward: string | null | undefined): ApolloClient<any> | undefined =>
  usePotentialService(wardService(ward) ?? "")?.client as ApolloClient<any> | undefined;
