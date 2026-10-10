import { MikroRow } from '@/components/mikro/MikroRow';
import { Chips, PagedList } from '@/components/mikro/PagedList';
import { describeLens } from '@/components/mikro/rows';
import { MikroScreen } from '@/components/mikro/states';
import { GetLensesDocument, type ListLensFragment } from '@/lib/mikro/api/graphql';
import * as React from 'react';

const KINDS = [
  { key: 'ALL', label: 'All' },
  { key: 'ARRAY', label: 'Array' },
  { key: 'TABLE', label: 'Table' },
  { key: 'ANNOTATION', label: 'Annotation' },
  { key: 'SPARSE', label: 'Sparse' },
  { key: 'MESH', label: 'Mesh' },
  { key: 'NETWORK', label: 'Network' },
] as const;

/** The crops, sub-volumes and windows people cut; the whole lens of a dataset is its own page. */
export default function LensesScreen() {
  const [kind, setKind] = React.useState<(typeof KINDS)[number]['key']>('ALL');
  return (
    <MikroScreen>
      <Chips options={KINDS} active={kind} onSelect={setKind} />
      <PagedList<ListLensFragment>
        key={kind}
        document={GetLensesDocument}
        field="lenses"
        filters={{ sliced: true, ...(kind === 'ALL' ? {} : { kind }) }}
        ordering={[{ createdAt: 'DESC' }]}
        renderItem={(lens) => <MikroRow {...describeLens(lens)} />}
        what="lenses"
        empty={{ title: 'No lenses', description: 'A lens is a selection cut out of a dataset. None have been made yet.' }}
      />
    </MikroScreen>
  );
}
