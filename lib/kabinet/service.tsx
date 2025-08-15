import kabinetResult from "@/lib/kabinet/api/fragments";
import { createGraphQLServiceBuilder } from "../arkitekt/builders/graphQlServiceBuidler";
import { ServiceDefinition } from "../arkitekt/provider";

export const kabinetDefinition: ServiceDefinition = {
  builder: createGraphQLServiceBuilder(kabinetResult.possibleTypes),
  requirements: [
    {
      key: "kabinet",
      service: "live.arkitekt.kabinet",
      optional: false,
    },
  ],
  key: "kabinet",

  name: "Kabinet",
  description: "Kabinet is a service for managing microservices.",
  service: "live.arkitekt.kabinet",
  optional: false,
};
