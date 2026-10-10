import { aliasToHttpPath } from "../arkitekt/alias/helpers";
import { ServiceDefinition } from "../arkitekt/provider";

/** The organization's object store (S3). There is no client: objects are fetched by signed url. */
export type DatalayerClient = { url: string };

export const datalayerServiceDefinition: ServiceDefinition = {
  key: "datalayer",
  name: "Datalayer",
  description: "The datalayer stores the organization's files and pictures.",
  service: "live.arkitekt.s3",
  optional: true,
  omitchallenge: true,
  builder: ({ alias }) => ({
    client: { url: aliasToHttpPath(alias, "") } satisfies DatalayerClient,
    alias,
  }),
};
