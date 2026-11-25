import { aliasToWsPath } from "../arkitekt/alias/helpers";
import { ServiceDefinition } from "../arkitekt/provider";
import { createLivekitClient } from "./client";

export const livekitServiceDefinition: ServiceDefinition = {
    key: "livekit",
    service: "io.livekit.livekit",
    optional: true,
    omitchallenge: true,
    builder: ({ alias, origin }) => {
      return {
        client: createLivekitClient({
          url: aliasToWsPath(alias, ""),
          host: (origin ?? alias).host,
        }),
        alias
      };
    },
  }
