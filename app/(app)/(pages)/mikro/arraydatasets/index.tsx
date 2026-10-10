import { MikroRow } from '@/components/mikro/MikroRow';
import { Chips, PagedList } from '@/components/mikro/PagedList';
import { describeArrayDataset } from '@/components/mikro/rows';
import { MikroScreen } from '@/components/mikro/states';
import { GetArrayDatasetsDocument, type ListArrayDatasetFragment } from '@/lib/mikro/api/graphql';
import * as React from 'react';

/** Orkestrator opens on "acquired only" too: what a pipeline derived is reached from its source. */
const VIEWS = [
  { key: 'acquired', label: 'Acquired', filters: { notDerived: true } },
  { key: 'pictured', label: 'With a picture', filters: { hasDefaultScene: true } },
  { key: 'all', label: 'All', filters: {} },
] as const;

export default function ArrayDatasetsScreen() {
  const [view, setView] = React.useState<(typeof VIEWS)[number]['key']>('acquired');
  const active = VIEWS.find((v) => v.key === view) ?? VIEWS[0];
  return (
    <MikroScreen>
      <Chips options={VIEWS} active={view} onSelect={setView} />
      <PagedList<ListArrayDatasetFragment>
        key={view}
        document={GetArrayDatasetsDocument}
        field="arrayDatasets"
        filters={active.filters}
        ordering={[{ createdAt: 'DESC' }]}
        renderItem={(dataset) => <MikroRow {...describeArrayDataset(dataset)} />}
        what="datasets"
        empty={{ title: 'No datasets', description: 'Images and volumes show up here once something is uploaded or acquired.' }}
      />
    </MikroScreen>
  );
}
