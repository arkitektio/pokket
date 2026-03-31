import rekuestResult from "@/lib/rekuest/api/fragments";
import { createGraphQLServiceBuilder } from "../arkitekt/builders/graphQlServiceBuidler";
import { ServiceDefinition } from "../arkitekt/provider";

export const rekuestServiceDefinition: ServiceDefinition = {
  builder: createGraphQLServiceBuilder(rekuestResult.possibleTypes),
  
  description: "Rekuest is a service for managing tasks.",
  key: "rekuest",
  name: "Rekuest",
  service: "live.arkitekt.rekuest",
  optional: false,
};
