import * as React from 'react';
import {View} from 'react-native';
import {
  BASE_CATALOG_ADDRESS,
  createBlokComponent,
  ownBlokCatalog,
  type BlokComponentDefinition,
  type BlokRenderArgs,
} from '@arkitektio/bsx/runtime';
import {ORKESTRATOR_CATALOG_ID} from '@arkitektio/bsx/spec/catalogs';
import {Text} from '@/components/ui/text';
import {Guard} from '@/lib/app/App';
import {
  MikroSceneAnnotationsRender,
  MikroSceneLayersRender,
  MikroSceneProbeRender,
  MikroSceneRender,
  MikroSceneViewportRender,
} from './scene';
import {
  columnHistogramSchema,
  columnStatSchema,
  MIKRO_SCENE_EVENTS,
  MIKRO_SCENE_PANELS,
  MIKRO_SERVICE,
  mikroScenePanelSchema,
  mikroSceneSchema,
  mikroSceneViewportSchema,
  tableColumnsSchema,
  tableRowsSchema,
} from './schemas';
import {ColumnHistogramRender, ColumnStatRender, TableColumnsRender, TableRowsRender} from './tables';

/**
 * The Orkestrator's catalog (`https://arkitekt.live/catalogs/orkestrator/v1`),
 * drawn on the phone: mikro's scene parts and table readers, with the names,
 * props and placement orkestrator gives them (`mikro/bloks`), so a blok written
 * for the Orkestrator renders here. The tables are read in full; the scene
 * without its 3D view (`./scene.tsx` says what the phone does instead).
 *
 * Every component needs mikro where it is drawn: without it a notice shows in
 * its place, and none of its reads run (the guard wraps it from the outside).
 */

const Unavailable = () => (
  <View className="min-h-16 items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4 py-3">
    <Text className="text-center text-sm text-muted-foreground">Mikro is not available.</Text>
  </View>
);

/** A render behind mikro's guard. */
const guarded = (Render: React.ComponentType<BlokRenderArgs>) => {
  const Guarded = (args: BlokRenderArgs): React.ReactElement => (
    <Guard.Mikro fallback={<Unavailable />}>
      <Render {...args} />
    </Guard.Mikro>
  );
  Guarded.displayName = `Mikro(${Render.displayName ?? Render.name})`;
  return Guarded;
};

const INSIDE = {downstreamOf: ['MikroScene']} as const;

export const MikroSceneBlok = createBlokComponent(
  {
    name: 'MikroScene',
    service: MIKRO_SERVICE,
    acceptsChildren: true,
    placement: {notDownstreamOf: ['MikroScene']},
    events: MIKRO_SCENE_EVENTS,
    bindKinds: {bind: 'ANY', bindWorld: 'STRING'},
    schema: mikroSceneSchema,
  },
  guarded(MikroSceneRender),
);

export const MikroSceneViewportBlok = createBlokComponent(
  {name: 'MikroSceneViewport', service: MIKRO_SERVICE, placement: INSIDE, schema: mikroSceneViewportSchema},
  guarded(MikroSceneViewportRender),
);

const panel = (name: keyof typeof MIKRO_SCENE_PANELS, Render: React.ComponentType<BlokRenderArgs>) =>
  createBlokComponent(
    {name, service: MIKRO_SERVICE, placement: INSIDE, schema: mikroScenePanelSchema.describe(MIKRO_SCENE_PANELS[name])},
    guarded(Render),
  );

export const MikroSceneLayersBlok = panel('MikroSceneLayers', MikroSceneLayersRender);
export const MikroSceneAnnotationsBlok = panel('MikroSceneAnnotations', MikroSceneAnnotationsRender);
export const MikroSceneProbeBlok = panel('MikroSceneProbe', MikroSceneProbeRender);

const reader = (name: string, schema: Parameters<typeof createBlokComponent>[0]['schema'], Render: React.ComponentType<BlokRenderArgs>) =>
  createBlokComponent({name, schema, service: MIKRO_SERVICE, writesRecordTo: 'bind'}, guarded(Render));

export const TableColumnsBlok = reader('TableColumns', tableColumnsSchema, TableColumnsRender);
export const ColumnStatBlok = reader('ColumnStat', columnStatSchema, ColumnStatRender);
export const ColumnHistogramBlok = reader('ColumnHistogram', columnHistogramSchema, ColumnHistogramRender);
export const TableRowsBlok = reader('TableRows', tableRowsSchema, TableRowsRender);

export const ORKESTRATOR_BLOKS: readonly BlokComponentDefinition[] = [
  MikroSceneBlok,
  MikroSceneViewportBlok,
  MikroSceneLayersBlok,
  MikroSceneAnnotationsBlok,
  MikroSceneProbeBlok,
  TableColumnsBlok,
  ColumnStatBlok,
  ColumnHistogramBlok,
  TableRowsBlok,
];

/** The Orkestrator's catalog as pokket implements it: claimed whole (`orkestrator@1`). */
export const orkestratorCatalog = ownBlokCatalog(
  {
    id: ORKESTRATOR_CATALOG_ID,
    name: 'orkestrator',
    version: 1,
    extends: BASE_CATALOG_ADDRESS,
    description:
      "What the Orkestrator draws beyond the base catalog: the components of the services it has modules for (mikro's scene and tables). A blok written for it names it as its catalog.",
  },
  ORKESTRATOR_BLOKS,
);
