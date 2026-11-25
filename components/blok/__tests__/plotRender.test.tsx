import {describe, expect, it, jest} from '@jest/globals';
import * as React from 'react';
import {parseBsx} from '@arkitektio/bsx';
import {normalizeBlokComponentTree} from '@arkitektio/bsx/runtime';
import {act} from 'react-test-renderer';
import {renderBlok, shownTexts} from '../testing';

jest.mock('sonner-native', () => ({toast: {info: jest.fn(), error: jest.fn()}}));
jest.mock('@rn-primitives/slot', () => {
  const {Pressable, Text, View} = jest.requireActual<typeof import('react-native')>('react-native');
  return {Pressable, Text, View};
});
// No lovekit or livekit here: a live trace says so in its row instead of joining a room.
jest.mock('@/lib/app/App', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const guard = ({fallback}: {children: React.ReactNode; fallback?: React.ReactNode}) =>
    ReactActual.createElement(ReactActual.Fragment, null, fallback ?? null);
  return {Guard: new Proxy({}, {get: () => guard}), App: {useService: () => ({client: {}})}};
});

/** The Orkestrator's Plot on the phone, with what is mounted in it. */
describe('a Plot', () => {
  const plot = (body: string) =>
    normalizeBlokComponentTree([
      parseBsx(`<Blok kind="custom" context="panel">
        <Plot axis="wavelength" type="SPECTRUM" unit="nm" height="12rem">${body}</Plot>
      </Blok>`).tree,
    ]).roots;
  // The renders load on first use.
  const settle = () => act(async () => new Promise<void>(resolve => setTimeout(resolve, 50)));

  it('names its axis and says when nothing is mounted in it', async () => {
    const {renderer} = await renderBlok(plot(''));
    await settle();
    expect(shownTexts(renderer.root)).toEqual(expect.arrayContaining(['Nothing is drawn in this plot.', 'wavelength (nm)']));
  });

  it("gives each mount a row and says why one draws nothing", async () => {
    const {renderer} = await renderBlok(
      plot(`<LovekitTrace value={args.spectrum} /><MikroChartMount value={args.chart} />`),
      {args: {spectrum: {object: '1', __identifier: '@lovekit/stream'}, chart: {object: '2', __identifier: '@mikro/chart'}}},
    );
    await settle();
    const texts = shownTexts(renderer.root);
    expect(texts).toEqual(
      expect.arrayContaining([
        'Waiting for data…',
        'Live streams are not available here.',
        'The phone does not draw mikro charts yet: open it in the Orkestrator.',
      ]),
    );
  });
});
