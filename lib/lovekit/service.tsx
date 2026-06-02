import lovekitResult from "@/lib/mikro/api/fragments";
import { createGraphQLServiceBuilder } from "../arkitekt/builders/graphQlServiceBuidler";
import { ServiceDefinition } from "../arkitekt/provider";

export const lovekitServiceDefinition: ServiceDefinition = {
  builder: createGraphQLServiceBuilder(lovekitResult.possibleTypes),
  name: "Lovekit",
  description: "Lovekit is a service for managing love-related functionalities.",
  key: "lovekit",
  service: "live.arkitekt.lovekit",
  optional: true,
};
