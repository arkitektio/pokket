import { MikroRow } from '@/components/mikro/MikroRow';
import { PagedList } from '@/components/mikro/PagedList';
import { describeTableDataset } from '@/components/mikro/rows';
import { MikroScreen } from '@/components/mikro/states';
import { GetTableDatasetsDocument, type ListTableDatasetFragment } from '@/lib/mikro/api/graphql';

export default function TableDatasetsScreen() {
  return (
    <MikroScreen>
      <PagedList<ListTableDatasetFragment>
        document={GetTableDatasetsDocument}
        field="tableDatasets"
        ordering={[{ createdAt: 'DESC' }]}
        renderItem={(item) => <MikroRow {...describeTableDataset(item)} />}
        what="tables"
        empty={{ title: 'No tables', description: 'Measurement tables show up here.' }}
      />
    </MikroScreen>
  );
}
