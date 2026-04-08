import { z } from "zod";

/**
 * Zod Schema for an individual eduroam Profile
 */
export const EduroamProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  eapconfig_endpoint: z.string().url(), // Validates it is a proper URL
});

/**
 * Zod Schema for an eduroam Instance (e.g., a specific University)
 */
export const EduroamInstanceSchema = z.object({
  id: z.string(),
  name: z.string(),
  profiles: z.array(EduroamProfileSchema),
  geo: z.array(z.number()),
  country: z.string().optional(),
});

/**
 * Zod Schema for the Discovery Service response
 */
export const EduroamDiscoverySchema = z.object({
  instances: z.array(EduroamInstanceSchema),
});

/**
 * Zod Schema for the EAP Configuration
 * Matches the XML structure: EAPIdentityProviderList > EAPIdentityProvider
 */
const EAPIdentityProviderSchema = z.object({
  AuthenticationMethods: z.object({
    AuthenticationMethod: z.object({
      EAPMethod: z.object({
        Type: z.number(),
      }),
      ServerSideCredential: z
        .object({
          CA: z
            .union([
              z.array(z.object({ "#text": z.string() })),
              z.object({ "#text": z.string() }),
            ])
            .optional(),
        })
        .optional(),
    }),
  }),
  CredentialApplicability: z.object({
    IEEE80211: z.union([z.array(z.any()), z.object({}).passthrough()]),
  }),
  ProviderInfo: z.object({
    DisplayName: z.union([z.string(), z.object({ "#text": z.string() })]),
  }),
});

export const EapConfigSchema = z.object({
  EAPIdentityProviderList: z.object({
    EAPIdentityProvider: EAPIdentityProviderSchema,
  }),
});

// Infer the TypeScript types from the Zod schemas
export type EduroamProfile = z.infer<typeof EduroamProfileSchema>;
export type EduroamInstance = z.infer<typeof EduroamInstanceSchema>;
export type EduroamDiscovery = z.infer<typeof EduroamDiscoverySchema>;
export type EapConfig = z.infer<typeof EapConfigSchema>;
