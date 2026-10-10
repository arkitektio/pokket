import { DetailPage } from '@/components/mikro/Detail';
import { Fact, FactsCard, Heading, Section } from '@/components/mikro/Facts';
import { MikroRow } from '@/components/mikro/MikroRow';
import { MIKRO_ICONS, describeScene } from '@/components/mikro/rows';
import { SnapshotImage } from '@/components/mikro/SnapshotImage';
import { GetLensDocument, type GetLensQuery, type DetailLensFragment } from '@/lib/mikro/api/graphql';
import { dayLabel, humanize, lensCut, lensSnapshot, lensSubjectName, lensTitle, mikroRoute, shapeLabel } from '@/lib/mikro/format';
import { View } from 'react-native';

/** The page of what a lens selects over, for the kinds that have one here. */
const subjectRow = (lens: DetailLensFragment) => {
  if (lens.__typename === 'ArrayLens') {
    return { href: mikroRoute.arrayDataset(lens.dataset.id), icon: MIKRO_ICONS.arrayDataset, title: lens.dataset.name };
  }
  if (lens.__typename === 'TableLens') {
    return { href: mikroRoute.tableDataset(lens.tableDataset.id), icon: MIKRO_ICONS.tableDataset, title: lens.tableDataset.name };
  }
  return null;
};

/** A lens: what it selects, out of what. Orkestrator opens the viewer here; the phone shows its last picture. */
export default function LensScreen() {
  return (
    <DetailPage
      document={GetLensDocument}
      pick={(data: GetLensQuery) => data.lens}
      title={lensTitle}
      what="lens"
    >
      {(lens) => {
        const subject = subjectRow(lens);
        return (
          <>
            <View className="px-4 pt-4">
              <SnapshotImage snapshot={lensSnapshot(lens)} icon={MIKRO_ICONS.lens} width="100%" height={220} />
            </View>
            <Heading title={lensTitle(lens)} detail={lens.name ? lensSubjectName(lens) : null} />
            <FactsCard>
              <Fact label="Kind" value={humanize(lens.kind)} />
              <Fact label="Selects" value={lensCut(lens) || 'Everything'} />
              {lens.__typename === 'ArrayLens' ? <Fact label="Shape" value={shapeLabel(lens.shape, lens.axisNames)} /> : null}
              <Fact label="Space" value={lens.coordinateSystem?.name} />
              <Fact label="Created" value={dayLabel(lens.createdAt)} />
            </FactsCard>
            <Section title="Selected from" items={subject ? [subject] : []} render={(row) => <MikroRow key={row.href} {...row} />} />
            <Section
              title="Scenes"
              items={lens.__typename === 'ArrayLens' ? lens.scenes : lens.defaultScene ? [lens.defaultScene] : []}
              render={(scene) => <MikroRow key={scene.id} {...describeScene(scene)} />}
            />
          </>
        );
      }}
    </DetailPage>
  );
}
