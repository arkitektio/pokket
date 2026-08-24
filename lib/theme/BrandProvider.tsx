import { ApolloClient } from '@apollo/client';
import { DarkTheme, Theme, ThemeProvider } from 'expo-router/react-navigation';
import * as React from 'react';
import { View } from 'react-native';
import { vars } from 'nativewind';

import { useArkitekt } from '../arkitekt/hooks';
import { MyBrandQuery, useMyBrandQuery } from '../lok/api/graphql';
import { buildNavTheme } from '../constants';
import {
  Brand,
  buildBrandTokens,
  buildThemeColors,
  DEFAULT_BRAND,
  normalizeBrand,
  ThemeColors,
} from './brandTokens';

/**
 * Tints the whole app with the logged-in user's brand color for the
 * organization the session is acting in.
 *
 * The color is a membership property — a (user, organization) pair — so the
 * same person can look different in different organizations, and two people in
 * one organization can look different from each other.
 *
 * There is deliberately no picker here: the color is assigned in
 * orkestrator-next, and pokket only reads it.
 */

const BrandContext = React.createContext<Brand>(DEFAULT_BRAND);

const ColorsContext = React.createContext<ThemeColors>(buildThemeColors());

/** The brand currently in effect. Always a usable pair — see `normalizeBrand`. */
export const useBrand = () => React.useContext(BrandContext);

/**
 * Resolved colors for props that take a color string instead of a class name.
 * Computed once per brand change in the provider rather than per consumer —
 * each call is a full pass of OKLCh conversions.
 */
export const useThemeColors = () => React.useContext(ColorsContext);

/**
 * Three levels, per field: the member's personal color for this organization,
 * then the organization's own default, then pokket's.
 *
 * The cascade is per field, not per pair — lok documents `brandHue` and
 * `brandChroma` as independently nullable, each meaning "not overridden, use
 * the organization's". So a member who set only a hue keeps the organization's
 * chroma rather than dropping the whole pair.
 */
const resolveBrand = (data: MyBrandQuery | undefined): Brand => {
  const organization = data?.mycontext?.organization;
  if (!organization) return DEFAULT_BRAND;

  // `MembershipFilter` still has no "my membership in organization X" filter,
  // so the match happens here rather than on the server.
  const membership = data?.me?.memberships?.find(
    (candidate) => candidate.organization?.id === organization.id,
  );

  return normalizeBrand(
    membership?.brandHue ?? organization.brandHue,
    membership?.brandChroma ?? organization.brandChroma,
  );
};

/**
 * Renders nothing; exists only so the query has somewhere to live.
 *
 * `useMyBrandQuery` goes through `useSelfService()`, which THROWS when there is
 * no connection — and `skip` cannot save it, because Apollo resolves the client
 * before it ever looks at `skip`. So a skipped query at the root would still
 * crash the login screen. Mounting is the gate. Keeping it in a leaf rather
 * than swapping the provider's own subtree means logging in mounts this one
 * null component instead of remounting the whole navigator.
 */
const BrandQuery = ({
  client,
  onResolve,
}: {
  client: ApolloClient<unknown>;
  onResolve: (brand: Brand, from: ApolloClient<unknown>) => void;
}) => {
  // `all` so a member with no color set still yields the organization default,
  // rather than failing the whole document. Errors are not handled here: every
  // lok query reports through lib/lok/funcs.tsx into the error log.
  const { data } = useMyBrandQuery({ errorPolicy: 'all' });

  const brand = React.useMemo(() => resolveBrand(data), [data]);

  // Reported with the client that produced it, so a color cannot outlive the
  // session it belongs to.
  React.useEffect(() => onResolve(brand, client), [brand, client, onResolve]);

  return null;
};

export const BrandProvider = ({ children }: { children: React.ReactNode }) => {
  const { connection } = useArkitekt();
  const client = connection?.selfService?.client as ApolloClient<unknown> | undefined;
  const canQuery = Boolean(client);

  const [resolved, setResolved] = React.useState<{
    client: ApolloClient<unknown>;
    brand: Brand;
  } | null>(null);

  /* `resolveBrand` builds a fresh object every time the query result changes,
     so compare by value to keep an unchanged color from re-rendering the app. */
  const applyBrand = React.useCallback((next: Brand, from: ApolloClient<unknown>) => {
    setResolved((previous) =>
      previous?.client === from &&
      previous.brand.hue === next.hue &&
      previous.brand.chroma === next.chroma
        ? previous
        : { client: from, brand: next },
    );
  }, []);

  /* Logging out has to drop the tint with the session that justified it, and
     logging back in must not flash the previous user's color. Both fall out of
     tying the stored brand to the client that produced it, rather than clearing
     it from an effect. */
  const brand =
    canQuery && resolved !== null && resolved.client === client ? resolved.brand : DEFAULT_BRAND;

  const tokens = React.useMemo(
    () => vars(buildBrandTokens(brand.hue, brand.chroma)),
    [brand.hue, brand.chroma],
  );

  const colors = React.useMemo(
    () => buildThemeColors(brand.hue, brand.chroma),
    [brand.hue, brand.chroma],
  );

  const navTheme = React.useMemo<Theme>(
    () => ({ ...DarkTheme, colors: buildNavTheme(brand.hue, brand.chroma) }),
    [brand.hue, brand.chroma],
  );

  return (
    <BrandContext.Provider value={brand}>
      <ColorsContext.Provider value={colors}>
      <ThemeProvider value={navTheme}>
        {canQuery ? <BrandQuery client={client!} onResolve={applyBrand} /> : null}
        {/* `flex: 1` is load-bearing — without it this View collapses to zero
            height and takes the whole navigator with it. */}
        <View style={[{ flex: 1 }, tokens]}>{children}</View>
      </ThemeProvider>
      </ColorsContext.Provider>
    </BrandContext.Provider>
  );
};
