import lokateResult from "@/lib/lokate/api/fragments";
import { createGraphQLServiceBuilder } from "../arkitekt/builders/graphQlServiceBuidler";
import { ServiceDefinition } from "../arkitekt/provider";

export const lokateServiceDefinition: ServiceDefinition = {
  builder: createGraphQLServiceBuilder(lokateResult.possibleTypes),
  description: "Lokate keeps a backup of your location timeline, readable by you alone.",
  key: "lokate",
  name: "Timeline backup",
  service: "live.arkitekt.lokate",
  optional: true,
};
