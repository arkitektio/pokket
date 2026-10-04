import { parseIncomingLink } from '@/lib/deeplink/incoming';
import { rememberPendingLink } from '@/lib/deeplink/pending';

/**
 * Every URL the system opens the app with passes here before the router
 * sees it. A link to a page is taken off the router's hands and kept for the
 * gate (`DeepLinkGate`): at launch the login is not restored yet, and the
 * link may belong to another organization than the live one. The router is
 * sent to the app's root at launch, and nowhere while the app is running.
 */
export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }) {
  try {
    const request = parseIncomingLink(path);
    if (!request) return path;
    rememberPendingLink(request);
    return initial ? '/' : '';
  } catch {
    return path;
  }
}
