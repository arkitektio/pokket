import {describe, expect, it} from '@jest/globals';
import {declaredLocals, declaredQueries, demoModel, liveModel, type BlokDeclarations} from '@arkitektio/bsx/renderer/declarations';

/** What the server sends beside a blok's tree (`resolvedLocals`, `demo`, `queries`), as the fragments read it. */
const declarations: BlokDeclarations = {
  vocab: 2,
  resolvedLocals: [
    {key: 'iterations', kind: 'INT', default: 3, persist: true},
    {key: 'note', kind: 'ANY'},
  ],
  demo: {deps: {robot: {arm: {mode: 'idle'}}}, args: {image: 'i1'}, queries: {stats: {mean: 2}}},
  queries: [
    {
      key: 'stats',
      service: 'mikro',
      document: 'query Stats($image: ID!) { stats(image: $image) }',
      variables: [{key: 'image', valuePath: 'args.image'}],
    },
  ],
};

/** `<Button onClick={deps.robot.move(...) into move}/>`. */
const roots = [
  {
    id: 'go',
    component: 'Button',
    props: [{key: 'onClick', agent_call: {dependency: 'robot', operation: 'move', arguments: []}, declares_value: 'move'}],
  },
];

describe('blok declarations', () => {
  it('types its locals by the resolved ports, persist included', () => {
    expect(declaredLocals(declarations).map(local => [local.key, local.kind, local.persist])).toEqual([
      ['iterations', 'INT', true],
      ['note', 'ANY', false],
    ]);
  });

  it('reads query variables in the runtime spelling', () => {
    expect(declaredQueries(declarations)[0].variables).toEqual([{key: 'image', value_path: 'args.image'}]);
  });

  it('starts live with locals at their defaults, idle into records and pending reads', () => {
    const {data, statuses} = liveModel(roots, declarations);
    expect(data.iterations).toBe(3);
    expect(data.note).toBeNull();
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
