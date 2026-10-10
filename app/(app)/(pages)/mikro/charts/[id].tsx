import { DetailPage } from '@/components/mikro/Detail';
import { Fact, FactsCard, Heading } from '@/components/mikro/Facts';
import { GetChartDocument, type GetChartQuery } from '@/lib/mikro/api/graphql';
import { dayLabel, humanize } from '@/lib/mikro/format';

const LAYER_NAMES: Record<string, string> = {
  TraceChartLayer: 'Trace',
  SeriesChartLayer: 'Series',
  AnnotationChartLayer: 'Annotations',
};

/** What a chart plots along which axis. The plot itself is drawn on the desktop. */
export default function ChartScreen() {
  return (
    <DetailPage
      document={GetChartDocument}
      pick={(data: GetChartQuery) => data.chart}
      title={(chart) => chart.name}
      what="chart"
    >
      {(chart) => (
        <>
          <Heading title={chart.name} detail={chart.description} />
          <FactsCard>
            <Fact label="Axis" value={chart.axis.longName || chart.axis.name} />
            <Fact label="Axis type" value={humanize(chart.axis.type)} />
            <Fact label="Unit" value={chart.axis.unit ? String(chart.axis.unit) : null} />
            <Fact label="Space" value={chart.worldCoordinateSystem.name} />
            <Fact label="Created" value={dayLabel(chart.createdAt)} />
            {chart.layers.map((layer, index) => (
              <Fact
                key={layer.id}
                label={`Layer ${index + 1}`}
                value={[layer.name, LAYER_NAMES[layer.__typename ?? ''] ?? ''].filter(Boolean).join(' · ') || 'Layer'}
              />
            ))}
          </FactsCard>
        </>
      )}
    </DetailPage>
  );
}
