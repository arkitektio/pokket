import { MIKRO_ICONS } from '@/components/mikro/rows';
import { SnapshotImage } from '@/components/mikro/SnapshotImage';
import { useQuery } from '@/lib/mikro/funcs';
import {
  GetArrayDatasetDocument,
  type GetArrayDatasetQuery,
  type GetArrayDatasetQueryVariables,
  GetSceneDocument,
  type GetSceneQuery,
  type GetSceneQueryVariables,
} from '@/lib/mikro/api/graphql';
import { useServiceClient } from '@/lib/structures/hooks';
import * as React from 'react';
import { View } from 'react-native';

/**
 * Any structure, opened for looking at (orkestrator's `StructureViewer`): the
 * object itself, filling the box it is mounted in. On the desktop mikro opens
 * an image or a scene in its interactive viewer; the phone renders neither,
 * so it shows their last picture, as their pages here do. Anything else, or
 * mikro while it is not connected, shows `fallback`.
 */

type ViewerProps = { id: string; height: number };

const ArrayDatasetViewer = ({ id, height }: ViewerProps) => {
  const { data } = useQuery<GetArrayDatasetQuery, GetArrayDatasetQueryVariables>(GetArrayDatasetDocument, { variables: { id } });
  return <SnapshotImage snapshot={data?.arrayDataset.latestSnapshot} icon={MIKRO_ICONS.arrayDataset} width="100%" height={height} />;
};

const SceneViewer = ({ id, height }: ViewerProps) => {
  const { data } = useQuery<GetSceneQuery, GetSceneQueryVariables>(GetSceneDocument, { variables: { id } });
  return <SnapshotImage snapshot={data?.scene.latestSnapshot} icon={MIKRO_ICONS.scene} width="100%" height={height} />;
};

/** The viewers pokket has, by the structure they open, and the service each needs. */
const VIEWERS: Record<string, { service: string; Viewer: React.ComponentType<ViewerProps> }> = {
  '@mikro/arraydataset': { service: 'mikro', Viewer: ArrayDatasetViewer },
  '@mikro/scene': { service: 'mikro', Viewer: SceneViewer },
};

export function StructureViewer({
  identifier,
  id,
  fallback = null,
}: {
  identifier: string;
  id: string;
  fallback?: React.ReactNode;
}) {
  const entry = VIEWERS[identifier];
  const client = useServiceClient(entry?.service);
  // The box's height, once laid out: the picture fills it.
  const [height, setHeight] = React.useState(0);
  if (!entry || !client) return <>{fallback}</>;
  const { Viewer } = entry;
  return (
    <View className="h-full w-full" onLayout={(event) => setHeight(event.nativeEvent.layout.height)}>
      {height > 0 ? <Viewer id={id} height={height} /> : null}
    </View>
  );
}
