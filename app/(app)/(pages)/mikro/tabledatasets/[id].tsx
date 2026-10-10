import { DetailPage } from '@/components/mikro/Detail';
import { Fact, FactsCard, Heading, SectionTitle } from '@/components/mikro/Facts';
import { GetTableDatasetDocument, type GetTableDatasetQuery } from '@/lib/mikro/api/graphql';
import { humanize } from '@/lib/mikro/format';

/** A table's columns. Its rows are read from parquet on the desktop. */
export default function TableDatasetScreen() {
  return (
    <DetailPage
      document={GetTableDatasetDocument}
      pick={(data: GetTableDatasetQuery) => data.tableDataset}
      title={(table) => table.name}
      what="table"
    >
      {(table) => (
        <>
          <Heading title={table.name} detail={table.description} />
          <FactsCard>
            <Fact label="Columns" value={String(table.columns.length)} />
            <Fact label="Axes" value={table.axisNames.join(', ')} />
          </FactsCard>
          {table.columns.length ? <SectionTitle title="Columns" /> : null}
          <FactsCard>
            {[...table.columns]
              .sort((a, b) => a.order - b.order)
              .map((column) => (
                <Fact
                  key={column.id}
                  label={column.longName || column.name}
                  value={[column.dtype, humanize(column.role), column.unit].filter(Boolean).join(' · ')}
                />
              ))}
          </FactsCard>
        </>
      )}
    </DetailPage>
  );
}
