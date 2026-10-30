import {useBlokDataAttributes} from '@arkitektio/bsx/runtime';

/**
 * Orkestrator's `useBlokDataAttributes`, for React Native: every component
 * sets exactly `data-busy` and `data-stale` (vocabulary
 * `theme.data_attributes`). React Native has no DOM attributes; NativeWind
 * reads `data-*` variants from a `dataSet` prop instead, so a blok's
 * `data-[busy]:opacity-60` and `data-[stale]:grayscale` style the element the
 * same way. Spread the result on the component's outermost host element.
 */
export type BlokDataSet = {dataSet?: {busy?: ''; stale?: ''}};

export const useBlokDataSet = (extra: {busy?: boolean} = {}): BlokDataSet => {
  const attributes = useBlokDataAttributes(extra);
  const busy = attributes['data-busy'] !== undefined;
  const stale = attributes['data-stale'] !== undefined;
  if (!busy && !stale) return {};
  return {dataSet: {...(busy ? {busy: ''} : {}), ...(stale ? {stale: ''} : {})}};
};
