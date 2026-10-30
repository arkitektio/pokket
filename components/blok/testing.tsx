import * as React from 'react';
import {act, create, type ReactTestInstance, type ReactTestRenderer} from 'react-test-renderer';
import {useBlokRuntimeStoreApi, type BlokRuntimeStore} from '@arkitektio/bsx/runtime';
import BlokRenderer from './BlokRenderer';

/**
 * Renders a v2 blok tree (`{id, component, props, children}`) for a test and
 * hands back the runtime store, as orkestrator's `bloks/testing.tsx` does
 * from BSX. Pokket has no BSX parser: tests write the stored tree.
 */

type RendererProps = Omit<React.ComponentProps<typeof BlokRenderer>, 'uiComponents' | 'initialState' | 'children'>;

const StoreProbe = ({onStore}: {onStore: (store: BlokRuntimeStore) => void}) => {
  const store = useBlokRuntimeStoreApi();
  onStore(store);
  return null;
};

export const renderBlok = async (
  tree: readonly unknown[],
  state: unknown = {},
  props: RendererProps = {},
): Promise<{renderer: ReactTestRenderer; store: BlokRuntimeStore}> => {
  let store: BlokRuntimeStore | undefined;
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(
      <BlokRenderer dispatchAction={() => undefined} {...props} uiComponents={tree} initialState={state}>
        <StoreProbe onStore={found => (store = found)} />
      </BlokRenderer>,
    );
  });
  if (!renderer || !store) throw new Error('The blok did not render.');
  return {renderer, store};
};

const isText = (node: ReactTestInstance): boolean => (node.type as unknown) === 'Text';

/** Every string a rendered tree shows, outermost `<Text>` by outermost `<Text>`. */
export const shownTexts = (root: ReactTestInstance): string[] => {
  const textOf = (node: ReactTestInstance): string =>
    node.children.map(child => (typeof child === 'string' ? child : textOf(child))).join('');
  const hasTextAncestor = (node: ReactTestInstance): boolean => {
    for (let parent = node.parent; parent; parent = parent.parent) if (isText(parent)) return true;
    return false;
  };
  return root.findAll(node => isText(node) && !hasTextAncestor(node)).map(textOf);
};

/** A `Text` node of the tree, the way loose text arrives in one. */
export const text = (id: string, value: string) => ({id, component: 'Text', props: [{key: 'text', static_value: value}]});

/** A `Text` node showing a path. */
export const textAt = (id: string, path: string) => ({id, component: 'Text', props: [{key: 'text', dynamic_value: {path}}]});
