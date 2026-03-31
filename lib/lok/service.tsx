import lokResult from "@/lib/lok/api/fragments";
import { createGraphQLServiceBuilder } from "../arkitekt/builders/graphQlServiceBuidler";
import { ServiceDefinition } from "../arkitekt/provider";

export const lokServiceDefinition: ServiceDefinition = {
  builder: createGraphQLServiceBuilder(lokResult.possibleTypes),
  description: "Lok is a service for managing microservices.",
  key: "lok",
  name: "Lok",
  service: "live.arkitekt.lok",
  optional: false,
};


export const lokServiceBuilder = createGraphQLServiceBuilder(lokResult.possibleTypes);