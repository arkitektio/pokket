import { ActiveFakts } from "../fakts/faktsSchema";
import { TokenResponse } from "../fakts/tokenSchema";

const TOKEN_REFRESH_SKEW_MS = 60_000;

export const normalizeToken = (token: TokenResponse): TokenResponse => ({
  ...token,
  received_at: token.received_at ?? Date.now(),
});

export const shouldRefreshToken = (token: TokenResponse): boolean => {
  if (!token.expires_in || !token.received_at) {
    return false;
  }

  const expiresAt = token.received_at + token.expires_in * 1000;
  return Date.now() >= expiresAt - TOKEN_REFRESH_SKEW_MS;
};

export const isAbortLikeError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes("cancel") ||
    error.message.includes("Cancel") ||
    error.message.includes("aborted") ||
    error.message.includes("Abort") ||
    error.message.includes("User Cancelled")
  );
};

export const refreshAccessToken = async (
  fakts: ActiveFakts,
  currentToken: TokenResponse,
  controller?: AbortController,
): Promise<TokenResponse> => {
  if (!currentToken.refresh_token) {
    throw new Error("No refresh token available – cannot refresh");
  }

  const response = await fetch(`${fakts.auth.token_url}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: currentToken.refresh_token,
      client_id: fakts.auth.client_id,
      client_secret: fakts.auth.client_secret,
    }),
    signal: controller?.signal,
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(
      `Failed to refresh token: ${response.status} ${response.statusText}\n${JSON.stringify(json)}`,
    );
  }

  return normalizeToken(json as TokenResponse);
};
