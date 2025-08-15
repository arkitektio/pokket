import mikroResult from "@/lib/mikro/api/fragments";
import { createGraphQLServiceBuilder } from "../arkitekt/builders/graphQlServiceBuidler";
import { ServiceDefinition } from "../arkitekt/provider";

export const mikroServiceDefinition: ServiceDefinition = {
  builder: createGraphQLServiceBuilder(mikroResult.possibleTypes),
  requirements: [
    {
      key: "mikro",
      service: "live.arkitekt.mikro",
      optional: false,
    },
  ],
  name: "Mikro",
  description: "Mikro is a service for managing microservices.",
  key: "mikro",
  service: "live.arkitekt.mikro",
  optional: false,
};
