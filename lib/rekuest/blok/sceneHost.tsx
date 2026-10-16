import * as React from 'react';
import {ActivityIndicator, View} from 'react-native';
import {
  BlokSceneHostProvider,
  type BlokModelDecoration,
  type BlokSceneHost,
} from '@/components/blok/catalog/scene/host';
import {Text} from '@/components/ui/text';
import {phonePolicy} from '@/lib/scene/glb';
import {useAssetPolicyQuery, useBloksForModelQuery, useListMaterializedBloksQuery} from '../api/graphql';

/**
 * rekuest as the host of 3D scenes (orkestrator's `RekuestSceneHost`): its
 * bloks are what `OnClick open=` and model decorations show, and its policy,
 * tightened to what a phone can hold, is what a model is held to. Where a
 * model's file comes from is `RekuestAssetHost`'s.
 */

/** Lazy: `MaterializedBlokRenderer` wraps itself in this host, so the import is a cycle until render time. */
const MaterializedBlokById = React.lazy(() => import('@/components/blok/MaterializedBlokById'));

const MaterializedBlokCard = ({id}: {id: string}) => (
  <React.Suspense fallback={<ActivityIndicator />}>
    <MaterializedBlokById materializedBlokId={id} />
  </React.Suspense>
);

const NamedBlok = ({name}: {name: string}) => {
  const {data, loading} = useListMaterializedBloksQuery({variables: {filters: {search: name}}});
  const match = data?.materializedBloks.find(candidate => candidate.blok.name === name);
  if (match) return <MaterializedBlokCard id={match.id} />;
  return (
    <View>
      <Text className="text-xs text-muted-foreground">{loading ? 'Loading…' : `No blok named "${name}".`}</Text>
    </View>
  );
};

const NO_DECORATIONS: readonly BlokModelDecoration[] = Object.freeze([]);

const useModelDecorations = (ref: string): readonly BlokModelDecoration[] => {
  const {data} = useBloksForModelQuery({variables: {ref}, skip: !ref});
  return React.useMemo(() => {
    const bloks = data?.bloksForModel ?? [];
    if (!bloks.length) return NO_DECORATIONS;
    return bloks.flatMap(blok => {
      const materialized = blok.materializedBloks[0];
      return materialized
        ? [{name: blok.name, node: blok.forNode ?? null, render: () => <MaterializedBlokCard id={materialized.id} />}]
        : [];
    });
  }, [data]);
};

const renderBlok = (name: string): React.ReactNode => <NamedBlok name={name} />;

export const RekuestSceneHost = ({children}: {children: React.ReactNode}) => {
  const {data} = useAssetPolicyQuery();
  const server = data?.assetPolicy.model;
  const policy = React.useMemo(() => phonePolicy(server), [server]);
  const host = React.useMemo<BlokSceneHost>(() => ({useModelDecorations, renderBlok, policy}), [policy]);
  return <BlokSceneHostProvider value={host}>{children}</BlokSceneHostProvider>;
};
