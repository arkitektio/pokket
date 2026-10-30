import * as React from 'react';
import {useActiveProfile} from '@/lib/arkitekt/hooks';
import type {BlokViewer} from '@arkitektio/bsx/runtime';

/**
 * `viewer`: who is looking, as the active login says it (vocabulary
 * `records.viewer`): the user, the organization and the roles in it, as lok's
 * `mycontext` told `ProfileIdentitySync`. orkestrator's `useBlokViewer`.
 * Nothing beyond what the viewer's own login already tells them.
 */
export const useBlokViewer = (): BlokViewer | null => {
  const profile = useActiveProfile();
  const userId = profile?.identity.userId ?? null;
  const username = profile?.label.username ?? null;
  const orgId = profile?.identity.organizationId ?? null;
  // Joined into a key: the stored array is a fresh instance after every write.
  const rolesKey = (profile?.label.roles ?? []).join('\u0000');
  return React.useMemo(
    () =>
      userId
        ? {
            user: {id: userId, username},
            org: orgId ? {id: orgId} : null,
            roles: rolesKey ? rolesKey.split('\u0000') : [],
          }
        : null,
    [orgId, rolesKey, userId, username],
  );
};
