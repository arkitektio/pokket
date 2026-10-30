import {describe, expect, it, jest} from '@jest/globals';
import * as React from 'react';
import {act, create, type ReactTestRenderer} from 'react-test-renderer';
import {shownTexts} from '@/components/blok/testing';
import {createTravelSource, type TravelSource} from '@/lib/rekuest/travel/travelSource';
import {useTravelController, type BlokTravel} from '@/lib/rekuest/travel/useBlokTravel';
import {formatAgo, formatMoment, sliderValueAt, TravelBar} from '../travel/TravelBar';

jest.mock('sonner-native', () => ({toast: {info: jest.fn(), error: jest.fn(), success: jest.fn()}}));

/**
 * The history bar on a travel source that answers at once: entering the past,
 * moving through it, and going back to live, as a thumb does it.
 */

const source = (): TravelSource =>
  createTravelSource({
    checkout: async () => ({values: {}, globalRevision: 0, forwardPatches: [], backwardPatches: []}),
    schedule: () => 0,
    cancel: () => undefined,
    setTimer: () => 0,
    clearTimer: () => undefined,
  });

const Bar = ({on, onTravel}: {on: TravelSource; onTravel: (travel: BlokTravel) => void}) => {
  const travel = useTravelController(on);
  onTravel(travel);
  return <TravelBar travel={travel} />;
};

const mount = async (on: TravelSource) => {
  let travel: BlokTravel | undefined;
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(<Bar on={on} onTravel={found => (travel = found)} />);
  });
  if (!renderer || !travel) throw new Error('The bar did not render.');
  return {renderer, travel: () => travel as BlokTravel};
};

describe('the history bar', () => {
  it('is live until a moment is picked, then shows the past from the source', async () => {
    const on = source();
    const {renderer, travel} = await mount(on);
    expect(shownTexts(renderer.root)).toContain('LIVE');
    expect(travel().source).toBeNull();

    const moment = Date.now() - 10 * 60_000;
    await act(async () => travel().commit(moment));
    expect(shownTexts(renderer.root)).toContain('PAST');
    expect(travel().source).toBe(on);
    expect(on.getClock().at).toBe(moment);

    await act(async () => travel().goLive());
    expect(shownTexts(renderer.root)).toContain('LIVE');
    expect(travel().source).toBeNull();
    act(() => renderer.unmount());
  });

  it('goes live when let go at the present, and when it is closed', async () => {
    const on = source();
    const {renderer, travel} = await mount(on);
    await act(async () => travel().commit(Date.now()));
    expect(travel().travelling).toBe(false);

    await act(async () => travel().toggle());
    await act(async () => travel().scrub(Date.now() - 60_000));
    expect(travel().travelling).toBe(true);
    await act(async () => travel().toggle());
    expect(travel().open).toBe(false);
    expect(travel().travelling).toBe(false);
    act(() => renderer.unmount());
  });

  it('turns a finger on the slider into whole seconds of its stretch', () => {
    expect(sliderValueAt(0, 200, 10_000, 20_000)).toBe(10_000);
    expect(sliderValueAt(100, 200, 10_000, 20_000)).toBe(15_000);
    expect(sliderValueAt(500, 200, 10_000, 20_000)).toBe(20_000);
    // Before it is laid out it stands on the present.
    expect(sliderValueAt(50, 0, 10_000, 20_000)).toBe(20_000);
  });

  it('says when a moment was, with the day only when it is not today', () => {
    const now = new Date(2026, 9, 27, 12, 0, 0).getTime();
    expect(formatMoment(new Date(2026, 9, 27, 9, 5, 3).getTime(), now)).toBe('09:05:03');
    expect(formatMoment(new Date(2026, 9, 25, 9, 5, 3).getTime(), now)).toBe('25 Oct 09:05:03');
    expect(formatAgo(now - 30_000, now)).toBe('30 s ago');
    expect(formatAgo(now - 3 * 3_600_000, now)).toBe('3 h ago');
  });
});
