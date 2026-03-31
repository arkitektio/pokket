import { z } from "zod";

export const TokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number().optional(),
  scope: z.string().optional(),
  refresh_token: z.string().optional(), // not usually in client_credentials, but added for completeness
  received_at: z.number().optional(),
});

export type TokenResponse = z.infer<typeof TokenResponseSchema>;
