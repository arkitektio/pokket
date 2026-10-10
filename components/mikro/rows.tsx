import type {
  ListAnnotationFragment,
  ListArrayDatasetFragment,
  ListChartFragment,
  ListFileFragment,
  ListFolderFragment,
  ListLensFragment,
  ListSceneFragment,
  ListTableDatasetFragment,
} from '@/lib/mikro/api/graphql';
import {
  bytesLabel,
  humanize,
  lensDetail,
  lensSnapshot,
  lensTitle,
  mikroRoute,
  shapeLabel,
  specLabel,
} from '@/lib/mikro/format';
import { ChartLine, File, Folder, Image as ImageIcon, Layers, ScanSearch, Shapes, Table2 } from 'lucide-react-native';

/** The glyph of each kind, also the stand-in for a missing picture. */
export const MIKRO_ICONS = {
  arrayDataset: ImageIcon,
  lens: ScanSearch,
  folder: Folder,
  file: File,
  scene: Layers,
  tableDataset: Table2,
  chart: ChartLine,
  annotation: Shapes,
};

/**
 * What a row or tile says about each kind. Data, not components, so a row, a
 * tile and a search hit all say the same thing.
 */
export const describeArrayDataset = (d: ListArrayDatasetFragment) => ({
  href: mikroRoute.arrayDataset(d.id),
  icon: MIKRO_ICONS.arrayDataset,
  title: d.name,
  detail: [specLabel(d.spec), shapeLabel(d.shape, d.axisNames)].filter(Boolean).join(' · '),
  snapshot: d.latestSnapshot ?? null,
});

export const describeLens = (lens: ListLensFragment) => ({
  href: mikroRoute.lens(lens.id),
  icon: MIKRO_ICONS.lens,
  title: lensTitle(lens),
  detail: lensDetail(lens),
  snapshot: lensSnapshot(lens),
});

export const describeScene = (scene: ListSceneFragment) => ({
  href: mikroRoute.scene(scene.id),
  icon: MIKRO_ICONS.scene,
  title: scene.name,
  snapshot: scene.latestSnapshot ?? null,
});

export const describeFolder = (folder: ListFolderFragment) => ({
  href: mikroRoute.folder(folder.id),
  icon: MIKRO_ICONS.folder,
  title: folder.name,
  detail: folder.description || (folder.isDefault ? 'Your default folder' : undefined),
});

export const describeFile = (file: ListFileFragment) => ({
  href: mikroRoute.file(file.id),
  icon: MIKRO_ICONS.file,
  title: file.name,
  detail: [bytesLabel(file.size), file.contentType].filter(Boolean).join(' · '),
});

export const describeTableDataset = (table: ListTableDatasetFragment) => ({
  href: mikroRoute.tableDataset(table.id),
  icon: MIKRO_ICONS.tableDataset,
  title: table.name,
  detail: table.description || table.axisNames.join(', '),
});

export const describeChart = (chart: ListChartFragment) => ({
  href: mikroRoute.chart(chart.id),
  icon: MIKRO_ICONS.chart,
  title: chart.name,
  detail: chart.description || [chart.axis.longName || chart.axis.name, chart.axis.unit].filter(Boolean).join(' · '),
});

export const describeAnnotation = (annotation: ListAnnotationFragment) => ({
  href: mikroRoute.annotation(annotation.id),
  icon: MIKRO_ICONS.annotation,
  title: annotation.name || humanize(annotation.kind),
  detail: [annotation.name ? humanize(annotation.kind) : '', annotation.collection.name, annotation.collection.scene?.name]
    .filter(Boolean)
    .join(' · '),
});
