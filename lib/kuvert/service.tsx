import kuvertResult from "@/lib/kuvert/api/fragments";
import { createGraphQLServiceBuilder } from "../arkitekt/builders/graphQlServiceBuidler";
import { ServiceDefinition } from "../arkitekt/provider";

export const kuvertServiceDefinition: ServiceDefinition = {
  builder: createGraphQLServiceBuilder(kuvertResult.possibleTypes),
  description: "Kuvert syncs the organization's mailboxes.",
  key: "kuvert",
  name: "Mail",
  service: "live.arkitekt.kuvert",
  optional: true,
};
