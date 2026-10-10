import { DetailPage } from '@/components/mikro/Detail';
import { Fact, FactsCard, Heading, Section } from '@/components/mikro/Facts';
import { MikroRow } from '@/components/mikro/MikroRow';
import { MIKRO_ICONS, describeScene } from '@/components/mikro/rows';
import { SnapshotImage } from '@/components/mikro/SnapshotImage';
import { GetAnnotationDocument, type GetAnnotationQuery } from '@/lib/mikro/api/graphql';
import { humanize } from '@/lib/mikro/format';
import { View } from 'react-native';

const extent = (bbox?: { min: number[]; max: number[] } | null) =>
  bbox ? bbox.min.map((low, i) => `${+low.toFixed(2)} – ${+(bbox.max[i] ?? low).toFixed(2)}`).join(' × ') : '';

/** A drawn shape: what it is, where it is pinned, and the scene it was drawn on. */
export default function AnnotationScreen() {
  return (
    <DetailPage
      document={GetAnnotationDocument}
      pick={(data: GetAnnotationQuery) => data.annotation}
      title={(annotation) => annotation.name || humanize(annotation.kind)}
      what="annotation"
    >
      {(annotation) => {
        const scene = annotation.collection.scene;
        return (
          <>
            {scene ? (
              <View className="px-4 pt-4">
                <SnapshotImage snapshot={scene.latestSnapshot} icon={MIKRO_ICONS.annotation} width="100%" height={200} />
              </View>
            ) : null}
            <Heading title={annotation.name || humanize(annotation.kind)} detail={annotation.description} />
            <FactsCard>
              <Fact label="Shape" value={humanize(annotation.kind)} />
              <Fact label="Collection" value={annotation.collection.name} />
              <Fact label="Extent" value={extent(annotation.intrinsicBbox)} />
              {annotation.coordinates.map((pin) => (
                <Fact key={pin.name} label={`Pinned at ${pin.name}`} value={String(pin.value)} />
              ))}
            </FactsCard>
            <Section title="Drawn on" items={scene ? [scene] : []} render={(s) => <MikroRow key={s.id} {...describeScene(s)} />} />
          </>
        );
      }}
    </DetailPage>
  );
}
