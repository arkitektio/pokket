import alpakaResult from "@/lib/alpaka/api/fragments";
import { createGraphQLServiceBuilder } from "../arkitekt/builders/graphQlServiceBuidler";
import { ServiceDefinition } from "../arkitekt/provider";

export const alpakaServiceDefinition: ServiceDefinition = {
  builder: createGraphQLServiceBuilder(alpakaResult.possibleTypes),
  description: "Alpaka holds the organization's chat rooms and the assistants that answer in them.",
  key: "alpaka",
  name: "Chat",
  service: "live.arkitekt.alpaka",
  optional: true,
};
