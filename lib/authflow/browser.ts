import * as WebBrowser from "expo-web-browser";

/**
 * Where the relay sends a REDIRECT login back to: the desktop's scheme, which
 * the phone registers too (`app.json`), so the one URL every provider knows
 * works on both.
 */
export const callbackUrl = (namespace: string) => `orkestrator://${namespace}/auth/callback`;

const isWeb = (url: string) => /^https?:\/\//i.test(url);

/**
 * A REDIRECT login in the system's auth session. On iOS that is
 * ASWebAuthenticationSession: it closes as soon as the relay opens
 * `orkestrator://…` and answers that URL. On Android it is a Custom Tab, and
 * the deep link answers it. Resolves with the redirect URL, or null when the
 * user closed the browser without one. Only http(s) is ever opened.
 */
export const openRedirect = async (openUrl: string, namespace: string): Promise<string | null> => {
  if (!isWeb(openUrl)) throw new Error("The server sent a login address that is not a web page");
  const result = await WebBrowser.openAuthSessionAsync(openUrl, callbackUrl(namespace));
  return result.type === "success" ? result.url : null;
};

/**
 * A POLL login's page: an in-app browser over the app, so the app keeps
 * polling while the user approves the code.
 */
export const openPoll = async (openUrl: string) => {
  if (!isWeb(openUrl)) throw new Error("The server sent a login address that is not a web page");
  await WebBrowser.openBrowserAsync(openUrl);
};
