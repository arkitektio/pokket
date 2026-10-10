const HOUR_MS = 3_600_000;

/** When a grant stops being valid; one without an expiry lasts the hour and the next. */
export const grantExpiresAt = (expiresIn: number | null | undefined, issuedAt: number): number =>
  typeof expiresIn === "number" && expiresIn > 0
    ? issuedAt + expiresIn * 1000
    : issuedAt - (issuedAt % HOUR_MS) + 2 * HOUR_MS;

/**
 * The validity to sign a url for: from the start of the current UTC hour (so
 * the url is the same all hour) until the grant runs out, at most a week,
 * which is the longest SigV4 allows.
 */
export const signingWindow = (now: number, expiresAt: number): { at: Date; expiresSeconds: number } => {
  const start = now - (now % HOUR_MS);
  const seconds = Math.floor((expiresAt - start) / 1000);
  return { at: new Date(start), expiresSeconds: Math.max(60, Math.min(seconds, 7 * 24 * 3600)) };
};
