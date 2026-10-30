import {describe, expect, it, jest} from '@jest/globals';
import * as React from 'react';
import {act} from 'react-test-renderer';
import {renderInSession} from '@/components/rekuest/testing';
import {BlokTravelProvider, useBlokTravelMoment, useBoundState} from '../context';
import {createTravelSource, type TravelSnapshot, type TravelSource} from '../travelSource';

jest.mock('sonner-native', () => ({toast: {info: jest.fn(), error: jest.fn(), success: jest.fn()}}));

/**
 * What a blok's dependency reads, live or at the moment a travel source stands
 * on: the state the agent had then, and the moment itself as `then`.
 */

const MOMENT = Date.UTC(2026, 9, 27, 9, 30, 0);

const pastSource = (): TravelSource => {
  const source = createTravelSource({
    checkout: async () => ({values: {stage: {x: 3}}, globalRevision: 7, forwardPatches: [], backwardPatches: []}),
    now: () => MOMENT + 60_000,
    schedule: () => 0,
    cancel: () => undefined,
    setTimer: () => 0,
    clearTimer: () => undefined,
  });
  source.seek(MOMENT, true);
  return source;
};

type Seen = {state: TravelSnapshot; then: string | null};

const Probe = ({onSeen}: {onSeen: (seen: Seen) => void}) => {
  const state = useBoundState({agentID: 'a1', stateInterface: 'stage'});
  const then = useBlokTravelMoment();
  onSeen({state, then});
  return null;
};

const mount = async (source: TravelSource | null) => {
  let seen: Seen | undefined;
  const renderer = await renderInSession(
    <BlokTravelProvider source={source}>
      <Probe onSeen={found => (seen = found)} />
    </BlokTravelProvider>,
  );
  return {renderer, seen: () => seen as Seen};
};

describe('a dependency read through time', () => {
  it('reads the state the agent had at the moment shown, and the moment as then', async () => {
    const {renderer, seen} = await mount(pastSource());
    expect(seen().state).toEqual({value: {x: 3}, revision: 7, known: true});
    expect(seen().then).toBe(new Date(MOMENT).toISOString());
    act(() => renderer.unmount());
  });

  it('watches the agent live without a source: unknown until it answers, then null', async () => {
    const {renderer, seen} = await mount(null);
    expect(seen().state.known).toBe(false);
    expect(seen().then).toBeNull();
    act(() => renderer.unmount());
  });
});
