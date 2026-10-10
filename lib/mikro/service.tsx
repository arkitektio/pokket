import mikroResult from "@/lib/mikro/api/fragments";
import { createGraphQLServiceBuilder } from "../arkitekt/builders/graphQlServiceBuidler";
import { ServiceDefinition } from "../arkitekt/provider";

export const mikroServiceDefinition: ServiceDefinition = {
  builder: createGraphQLServiceBuilder(mikroResult.possibleTypes),
  
  name: "Mikro",
  description: "Mikro holds the organization's microscopy data.",
  key: "mikro",
  service: "live.arkitekt.mikro",
  optional: true,
};
