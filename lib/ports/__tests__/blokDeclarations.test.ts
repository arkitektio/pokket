import {describe, expect, it} from '@jest/globals';
import {parseBsx} from '@arkitektio/bsx';
import {declaredLocals, demoModel, liveModel, treeQueries, type BlokDeclarations} from '@arkitektio/bsx/renderer/declarations';

/**
 * A blok is one self-contained `<Blok kind context>` tree: its locals, reads
 * and their variables are written in it. The server resolves the locals (each
 * by its `<local>` node) and sends the demo beside the tree.
 */
const roots = [
  parseBsx(
    `<Blok kind="custom" context="panel">
      <local name="iterations" default={3} persist />
      <local name="note" />
      <query name="stats" service="mikro" document="query Stats($image: ID!) { stats(image: $image) }">
        <var key="image" value={args.image} />
      </query>
      <Button label="Go" onClick={agents.robot.move() into move} />
    </Blok>`,
  ).tree,
];

/** What the server sends beside the tree (`resolvedLocals`, `demo`), as the fragments read it. */
const declarations: BlokDeclarations = {
  vocab: 2,
  resolvedLocals: [
    {node: 'Blok[0]/local[0]', key: 'iterations', kind: 'INT', default: 3, persist: true},
    {node: 'Blok[0]/local[1]', key: 'note', kind: 'ANY'},
  ],
  demo: {deps: {robot: {arm: {mode: 'idle'}}}, args: {image: 'i1'}, queries: {stats: {mean: 2}}},
};

describe('blok declarations', () => {
  it('types its locals by the resolved ports, each by its node, persist included', () => {
    expect(declaredLocals(declarations).map(local => [local.node, local.key, local.kind, local.persist])).toEqual([
      ['Blok[0]/local[0]', 'iterations', 'INT', true],
      ['Blok[0]/local[1]', 'note', 'ANY', false],
    ]);
  });

  it("reads the tree's queries, their variables in the runtime spelling", () => {
    expect(treeQueries(roots).map(read => [read.key, read.service, read.variables])).toEqual([
      ['stats', 'mikro', [{key: 'image', value_path: 'args.image'}]],
    ]);
  });

  it('starts live with idle into records and pending reads', () => {
    const {data, statuses} = liveModel(roots);
    expect(data.move).toMatchObject({status: 'idle', running: false});
    expect(data.queries).toEqual({stats: {status: 'pending', value: null, error: null, refetching: false, fetching_more: false}});
    expect(statuses['queries.stats.value']).toEqual({status: 'pending'});
  });

  it('gives a preview its demo roots and its reads answered by the demo', () => {
    const model = demoModel(roots, declarations);
    expect(model.deps).toEqual({robot: {arm: {mode: 'idle'}}});
    expect(model.args).toEqual({image: 'i1'});
    expect(model.queries).toEqual({stats: {status: 'ready', value: {mean: 2}, error: null, refetching: false, fetching_more: false}});
  });
});
