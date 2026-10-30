import {describe, expect, it, jest} from '@jest/globals';
import {act, type ReactTestInstance, type ReactTestRenderer} from 'react-test-renderer';
import {renderBlok, shownTexts, textAt} from '../testing';

jest.mock('sonner-native', () => ({toast: {info: jest.fn(), error: jest.fn(), success: jest.fn()}}));
// Ships untranspiled JSX; `asChild` is never used by bloks.
jest.mock('@rn-primitives/slot', () => {
  const {Pressable, Text, View} = jest.requireActual<typeof import('react-native')>('react-native');
  return {Pressable, Text, View};
});

/**
 * A blok shown at a moment in the past (`travelAt`), as a travel provider
 * hands it to the renderer: `then` is the moment, and agent calls do not run.
 */

const pressable = (renderer: ReactTestRenderer, label: string): ReactTestInstance => {
  const [found] = renderer.root.findAll(
    node => typeof node.props.onPress === 'function' && shownTexts(node).some(shown => shown.includes(label)),
  );
  if (!found) throw new Error(`Nothing to press shows "${label}".`);
  return found;
};

const tree = [
  textAt('moment', 'then'),
  {
    id: 'run',
    component: 'Button',
    props: [
      {key: 'label', static_value: 'Home stage'},
      {key: 'onClick', agent_call: {dependency: 'self', operation: 'home', arguments: []}},
    ],
  },
];

const MOMENT = '2026-10-27T09:30:00.000Z';

describe('a blok travelling', () => {
  it('reads the moment it shows as then, and runs no agent call', async () => {
    const dispatchAction = jest.fn(() => undefined);
    const {renderer} = await renderBlok(tree, {}, {travelAt: MOMENT, dispatchAction});
    expect(shownTexts(renderer.root)).toContain(MOMENT);

    await act(async () => pressable(renderer, 'Home stage').props.onPress());
    expect(dispatchAction).not.toHaveBeenCalled();
  });

  it('acts again once it is live, then null', async () => {
    const dispatchAction = jest.fn(() => undefined);
    const {renderer, store} = await renderBlok(tree, {}, {dispatchAction});
    expect(shownTexts(renderer.root)).not.toContain(MOMENT);
    expect(store.getState().travelAt).toBeNull();

    await act(async () => pressable(renderer, 'Home stage').props.onPress());
    expect(dispatchAction).toHaveBeenCalledTimes(1);
  });

  it('follows the moment as the travel clock moves', async () => {
    const {renderer, store} = await renderBlok(tree, {}, {travelAt: MOMENT});
    const later = '2026-10-27T09:31:00.000Z';
    await act(async () => store.getState().setTravelAt(later));
    expect(shownTexts(renderer.root)).toContain(later);
  });
});
