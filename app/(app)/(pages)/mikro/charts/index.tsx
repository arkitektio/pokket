import { MikroRow } from '@/components/mikro/MikroRow';
import { PagedList } from '@/components/mikro/PagedList';
import { describeChart } from '@/components/mikro/rows';
import { MikroScreen } from '@/components/mikro/states';
import { GetChartsDocument, type ListChartFragment } from '@/lib/mikro/api/graphql';

export default function ChartsScreen() {
  return (
    <MikroScreen>
      <PagedList<ListChartFragment>
        document={GetChartsDocument}
        field="charts"
        ordering={[{ createdAt: 'DESC' }]}
        renderItem={(item) => <MikroRow {...describeChart(item)} />}
        what="charts"
        empty={{ title: 'No charts', description: 'A chart plots traces and series along one axis. None have been made yet.' }}
      />
    </MikroScreen>
  );
}
