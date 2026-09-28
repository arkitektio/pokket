import bankResult from "@/lib/bank/api/fragments";
import { createGraphQLServiceBuilder } from "../arkitekt/builders/graphQlServiceBuidler";
import { ServiceDefinition } from "../arkitekt/provider";

export const bankServiceDefinition: ServiceDefinition = {
  builder: createGraphQLServiceBuilder(bankResult.possibleTypes),
  description: "Bank syncs the organization's bank accounts and transactions.",
  key: "bank",
  name: "Bank",
  service: "live.arkitekt.bank",
  optional: true,
};
