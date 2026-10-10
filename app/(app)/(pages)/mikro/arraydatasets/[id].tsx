import { DetailPage } from '@/components/mikro/Detail';
import { Fact, FactsCard, Heading, Section } from '@/components/mikro/Facts';
import { MikroRow } from '@/components/mikro/MikroRow';
import { MIKRO_ICONS, describeLens, describeScene } from '@/components/mikro/rows';
import { SnapshotImage } from '@/components/mikro/SnapshotImage';
import { GetArrayDatasetDocument, type GetArrayDatasetQuery } from '@/lib/mikro/api/graphql';
import { humanize, mikroRoute, shapeLabel } from '@/lib/mikro/format';
import { View } from 'react-native';

/** A dataset: its picture if a scene of it has one, what it is, and the lenses and scenes made of it. */
export default function ArrayDatasetScreen() {
  return (
    <DetailPage
      document={GetArrayDatasetDocument}
      pick={(data: GetArrayDatasetQuery) => data.arrayDataset}
      title={(dataset) => dataset.name}
      what="dataset"
    >
      {(dataset) => (
        <>
          <View className="px-4 pt-4">
            <SnapshotImage snapshot={dataset.latestSnapshot} icon={MIKRO_ICONS.arrayDataset} width="100%" height={220} />
          </View>
          <Heading title={dataset.name} detail={dataset.description} />
          <FactsCard>
            <Fact label="Kind" value={dataset.spec.map(humanize).join(', ')} />
            <Fact label="Shape" value={shapeLabel(dataset.shape, dataset.axisNames)} />
            <Fact label="Resolution levels" value={dataset.multiscale ? 'Multiscale' : 'Single'} />
            <Fact
              label="Origin"
              value={
                dataset.derivedFrom.length
                  ? `Derived (${[...new Set(dataset.derivedFrom.map((step) => humanize(step.kind)))].join(', ')})`
                  : 'Acquired'
              }
            />
          </FactsCard>
          <Section
            title="In folder"
            items={dataset.folder ? [dataset.folder] : []}
            render={(folder) => (
              <MikroRow key={folder.id} href={mikroRoute.folder(folder.id)} icon={MIKRO_ICONS.folder} title={folder.name} />
            )}
          />
          <Section
            title="The whole dataset"
            items={dataset.fullLens ? [dataset.fullLens] : []}
            render={(lens) => (
              <MikroRow key={lens.id} href={mikroRoute.lens(lens.id)} icon={MIKRO_ICONS.lens} title="Whole lens" detail="Everything in this dataset" />
            )}
          />
          <Section title="Lenses" items={dataset.lenses} render={(lens) => <MikroRow key={lens.id} {...describeLens(lens)} />} />
          <Section title="Scenes" items={dataset.scenes} render={(scene) => <MikroRow key={scene.id} {...describeScene(scene)} />} />
        </>
      )}
    </DetailPage>
  );
}
