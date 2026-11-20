import {describe, expect, it, jest} from '@jest/globals';
import {blokCatalogSpec, normalizeBlokComponentTree, preflightBlokDocument, extendBlokCatalog, baseBlokCatalog} from '@arkitektio/bsx/runtime';
import {orkestratorCatalog as shippedOrkestrator, parseSpecCatalog, sameComponent} from '@arkitektio/bsx/spec/catalogs';
import {parseBsx} from '@arkitektio/bsx';
import {pokketBlokCatalog, pokketBlokUi} from '../catalog';
import {ORKESTRATOR_BLOKS} from '../catalog/orkestrator';

jest.mock('sonner-native', () => ({toast: {info: jest.fn(), error: jest.fn(), success: jest.fn()}}));
jest.mock('@rn-primitives/slot', () => {
  const {Pressable, Text, View} = jest.requireActual<typeof import('react-native')>('react-native');
  return {Pressable, Text, View};
});

/**
 * The Orkestrator's catalog on the phone: every component the snapshot bsx
 * ships (`orkestrator@1`) is drawn here, with the same props, events,
 * placement and service, so a blok written for the Orkestrator validates and
 * renders on both.
 */

/** Pokket's orkestrator definitions as the spec writes them. */
const drawn = () =>
  parseSpecCatalog(
    blokCatalogSpec(
      {id: 'https://arkitekt.live/catalogs/orkestrator/v1', name: 'orkestrator', version: 1, description: 'pokket'},
      extendBlokCatalog(baseBlokCatalog, 'pokket-orkestrator', ORKESTRATOR_BLOKS),
    ),
    'pokket',
  );

describe("the Orkestrator's catalog", () => {
  it('draws every component of the snapshot, and nothing it does not hold', () => {
    const shipped = shippedOrkestrator().components.map(component => component.name).sort();
    expect(drawn().components.map(component => component.name).sort()).toEqual(shipped);
  });

  it('gives each the props, events, placement and service the snapshot gives it', () => {
    const shipped = new Map(shippedOrkestrator().components.map(component => [component.name, component] as const));
    const differ = drawn().components.filter(component => {
      const spec = shipped.get(component.name);
      return !spec || !sameComponent(component, spec);
    });
    expect(differ.map(component => component.name)).toEqual([]);
  });

  it('is claimed whole beside the base catalog', () => {
    expect(pokketBlokUi.claims).toEqual(['base@4', 'orkestrator@1']);
    expect(ORKESTRATOR_BLOKS.map(definition => pokketBlokCatalog.components.get(definition.name)?.origin)).toEqual(
      ORKESTRATOR_BLOKS.map(() => 'orkestrator@1'),
    );
  });

  it("validates a blok written for the Orkestrator: a scene's parts inside it, a table's readers anywhere", () => {
    const tree = parseBsx(
      `<Blok kind="custom" context="panel">
        <MikroScene value={args.scene} bind={selected} onSelect={self.segment(lens: event.lens)}>
          <MikroSceneViewport height="20rem" />
          <MikroSceneLayers />
          <MikroSceneAnnotations height="12rem" />
        </MikroScene>
        <TableColumns value={args.table} role="ATTRIBUTE" bind={cols} />
        <ColumnHistogram value={args.table} column="area" />
        <TableRows value={args.table} where={[{"column": "area", "op": "gt", "value": 10}]} bind={rows} />
      </Blok>`,
    ).tree;
    const preflight = preflightBlokDocument(normalizeBlokComponentTree([tree]).roots, pokketBlokCatalog);
    expect(preflight.errors).toEqual([]);
    expect(preflight.invalidNodes.size).toBe(0);
  });
});
