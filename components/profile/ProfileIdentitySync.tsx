import { App } from '@/lib/app/App';
import { useMyBrandQuery, useMyContextQuery } from '@/lib/lok/api/graphql';
import { resolveBrand } from '@/lib/theme/BrandProvider';
import * as React from 'react';

/**
 * Tells the profile book who the live login is — orkestrator's
 * `ProfileIdentitySync`. lok's `mycontext` gives the login its real id (which
 * folds a repeat sign-in into the organization's existing row) and the labels
 * the switcher shows for it once it is parked: organization, user, brand.
 *
 * Only the live login is ever asked; a parked one would have to spend its
 * refresh token to be. Keyed on the profile by the caller, so an answer can
 * never be written onto the login that replaced it.
 */
function Sync({ profileId }: { profileId: string }) {
  const { setProfileIdentity } = App.useProfileActions();
  const baseUrl = App.useActiveProfile()?.identity.baseUrl;
  const { data: context } = useMyContextQuery({ errorPolicy: 'all' });
  const { data: brandData } = useMyBrandQuery({ errorPolicy: 'all' });

  const organization = context?.mycontext?.organization;
  const user = context?.mycontext?.user;

  React.useEffect(() => {
    if (!organization || !user || !baseUrl) return;
    const brand = brandData ? resolveBrand(brandData) : undefined;
    void setProfileIdentity(profileId, {
      identity: { baseUrl, userId: user.id, organizationId: organization.id },
      label: {
        organizationName: organization.name,
        organizationSlug: organization.slug,
        username: user.username,
        ...(brand ? { brandHue: brand.hue, brandChroma: brand.chroma } : {}),
      },
    });
    // Ids and names, not objects: a refetch with the same answer writes nothing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, baseUrl, organization?.id, organization?.name, organization?.slug, user?.id, user?.username, brandData]);

  return null;
}

export function ProfileIdentitySync() {
  const profileId = App.useActiveProfileId();
  const connected = App.useIsConnected();
  if (!profileId || !connected) return null;
  return <Sync key={profileId} profileId={profileId} />;
}
