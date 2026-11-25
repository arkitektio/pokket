import {describe, expect, it, jest} from '@jest/globals';
import * as React from 'react';
import {act, create, type ReactTestInstance} from 'react-test-renderer';

jest.mock('sonner-native', () => ({toast: {error: jest.fn(), success: jest.fn(), info: jest.fn()}}));
jest.mock('expo-router', () => {
  const {Fragment} = jest.requireActual<typeof import('react')>('react');
  return {Link: ({children}: {children: React.ReactNode}) => children, useRouter: () => ({}), Fragment};
});
// The logo is a blok read through Apollo; here it is a marker that says where it is drawn and how big.
jest.mock('@/components/agents/AgentLogo', () => {
  const {View} = jest.requireActual<typeof import('react-native')>('react-native');
  return {AgentLogo: ({className}: {className?: string}) => <View testID="logo" className={className} />};
});

// eslint-disable-next-line @typescript-eslint/no-require-imports -- after the mocks, on purpose
const {AgentCard, AgentCardRow, agentStatus, inPairs} = require('../AgentCard') as typeof import('../AgentCard');

const agent = (overrides: Record<string, unknown> = {}) =>
  ({
    __typename: 'Agent',
    id: '7',
    name: 'microscope-1',
    kind: 'WEBSOCKET',
    active: true,
    connected: true,
    blocked: false,
    pinned: false,
    lastSeen: '2026-11-25T10:00:00Z',
    app: {__typename: 'App', identifier: 'live.arkitekt.scope'},
    release: {__typename: 'Release', version: '1.4.0'},
    logo: {__typename: 'AgentLogo', blok: {__typename: 'Blok', id: 'b1'}},
    ...overrides,
  }) as never;

const texts = (root: ReactTestInstance) =>
  root.findAll(node => typeof node.type === 'string' && node.children.every(child => typeof child === 'string')).map(node => node.children.join(''));

/** A host view (what renders), not React Native's `View` component above it. */
const isHost = (node: ReactTestInstance) => (node.type as unknown) === 'View';

const classOf = (node: ReactTestInstance | null): string => (node ? String(node.props.className ?? '') : '');

describe("an agent's tile", () => {
  it('draws its logo large behind it and small in its header, under the app name its facts', async () => {
    let renderer!: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<AgentCard agent={agent()} />);
    });
    const logos = renderer.root.findAll(node => isHost(node) && node.props.testID === 'logo');
    // Large behind (filling the watermark), small in front.
    expect(logos.map(logo => logo.props.className).sort()).toEqual(['h-5 w-5', 'h-full w-full']);
    let watermark = logos.find(logo => logo.props.className === 'h-full w-full')!.parent;
    while (watermark && !(isHost(watermark) && watermark.props.style)) watermark = watermark.parent;
    expect(watermark?.props.style).toMatchObject({position: 'absolute', width: '66%', opacity: 0.08});

    const shown = texts(renderer.root);
    expect(shown).toEqual(expect.arrayContaining(['live.arkitekt.scope', 'v1.4.0', 'microscope-1']));
    // Connected: the theme colour, and no "seen" line.
    expect(shown.some(text => text.startsWith('seen'))).toBe(false);
    const card = renderer.root.findAll(node => isHost(node) && classOf(node).includes('rounded-2xl'))[0];
    expect(classOf(card)).toContain('bg-primary/10');
  });

  it('steps back when it is not there, and says when it was last seen', async () => {
    let renderer!: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<AgentCard agent={agent({connected: false, active: false, name: 'live.arkitekt.scope'})} />);
    });
    const card = renderer.root.findAll(node => isHost(node) && classOf(node).includes('rounded-2xl'))[0];
    expect(classOf(card)).toContain('opacity-70');
    const shown = texts(renderer.root);
    expect(shown.some(text => text.startsWith('seen'))).toBe(true);
    // Its own name is the app's: said once.
    expect(shown.filter(text => text === 'live.arkitekt.scope')).toHaveLength(1);
  });

  it('knows presence as orkestrator does, and pairs tiles two to a row', async () => {
    expect(agentStatus({connected: true, active: true, blocked: false})).toBe('online');
    expect(agentStatus({connected: false, active: true, blocked: false})).toBe('recent');
    expect(agentStatus({connected: false, active: false, blocked: false})).toBe('offline');
    expect(agentStatus({connected: true, active: true, blocked: true})).toBe('blocked');
    expect(inPairs([1, 2, 3])).toEqual([[1, 2], [3]]);

    let renderer!: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<AgentCardRow agents={[agent()]} />);
    });
    // A lone tile keeps half the width: a spacer takes the other half.
    const row = renderer.root.findAll(node => isHost(node) && classOf(node).includes('flex-row gap-2.5'))[0];
    const tiles = row.findAll(node => isHost(node) && classOf(node).includes('aspect-square'));
    const spacers = row.findAll(node => isHost(node) && classOf(node) === 'flex-1');
    expect([tiles.length, spacers.length]).toEqual([1, 1]);
  });
});
