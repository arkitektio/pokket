import type {BlokObjectSchema} from './types';

/**
 * A component of a blok catalog. Orkestrator's definition also carries the
 * React component that renders it; pokket only evaluates calls, so a catalog
 * here never has any and the shape is all that is needed.
 */
export type BlokComponentDefinition = {
  name: string;
  schema: BlokObjectSchema;
  render: unknown;
};
