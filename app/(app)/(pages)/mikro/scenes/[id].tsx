import { DetailPage } from '@/components/mikro/Detail';
import { Fact, FactsCard, Heading } from '@/components/mikro/Facts';
import { MIKRO_ICONS } from '@/components/mikro/rows';
import { SnapshotImage } from '@/components/mikro/SnapshotImage';
import { GetSceneDocument, type GetSceneQuery } from '@/lib/mikro/api/graphql';
import { dayLabel, humanize } from '@/lib/mikro/format';
import { View } from 'react-native';

/** A scene's last picture and what it is made of. The scene itself is rendered on the desktop only. */
export default function SceneScreen() {
  return (
    <DetailPage
      document={GetSceneDocument}
      pick={(data: GetSceneQuery) => data.scene}
      title={(scene) => scene.name}
      what="scene"
    >
      {(scene) => (
        <>
          <View className="px-4 pt-4">
            <SnapshotImage snapshot={scene.latestSnapshot} icon={MIKRO_ICONS.scene} width="100%" height={260} />
          </View>
          <Heading
            title={scene.name}
            detail={scene.latestSnapshot ? `Pictured ${dayLabel(scene.latestSnapshot.createdAt)}` : 'No picture has been taken of this scene yet.'}
          />
          <FactsCard>
            <Fact label="View" value={humanize(scene.preferredView)} />
            <Fact label="Space" value={scene.worldCoordinateSystem.name} />
            {scene.layers.map((layer, index) => (
              <Fact key={layer.id} label={`Layer ${index + 1}`} value={[layer.name, humanize(layer.kind)].filter(Boolean).join(' · ')} />
            ))}
          </FactsCard>
        </>
      )}
    </DetailPage>
  );
}
