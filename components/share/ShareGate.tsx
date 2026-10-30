import { App } from '@/lib/app/App';
import { showDetail } from '@/lib/navigation';
import { clearPendingShare, usePendingShare } from '@/lib/share/pending';
import { useTabsBootedFor } from '@/lib/tabs/TabsProvider';
import { usePathname } from 'expo-router';
import * as React from 'react';

/**
 * Opens the share screen once the app can show it: signed in, connected and with
 * its tabs up, as `DeepLinkGate` waits for a link. Files shared while signed out
 * wait for the sign-in. A share that arrives with the screen already open needs
 * nothing, because the screen picks it up by itself.
 */
export function ShareGate() {
  const waiting = usePendingShare();
  const active = App.useActiveProfile();
  const connected = App.useIsConnected();
  const bootedFor = useTabsBootedFor();
  const pathname = usePathname();

  const ready = !!active && connected && bootedFor === active.id;
  React.useEffect(() => {
    if (!waiting || !ready) return;
    clearPendingShare();
    if (pathname !== '/share') showDetail('/share');
  }, [waiting, ready, pathname]);

  return null;
}
