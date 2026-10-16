import { decodeQuery } from "@/lib/deeplink/shareScope";

/**
 * A redirect's query as a record. Decoded by hand rather than with
 * `URLSearchParams`, because React Native's version splits a value on every
 * `=` (a padded code) and throws on a bad escape.
 */
export const redirectParams = (text: string): Record<string, string> => {
  const trimmed = text.trim().split("#")[0];
  const at = trimmed.indexOf("?");
  return decodeQuery(at < 0 ? trimmed : trimmed.slice(at + 1));
};

/** The `code` and `state` a provider redirect carries, from a pasted URL or query string. */
export const parseRedirect = (text: string): { code: string; state: string } | null => {
  const { code, state } = redirectParams(text);
  return code && state ? { code, state } : null;
};

/** The provider's own refusal in a redirect's query (the user said no, …), if any. */
export const redirectError = (params: Record<string, string>): string | null =>
  params.error_description || params.error || null;
