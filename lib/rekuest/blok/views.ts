import type { ComponentContext } from '../api/graphql';

/** A context by its value: type-only, so this stays importable without the generated hooks. */
type Context = `${ComponentContext}`;

/**
 * The bloks page's views, by the context a blok renders in. Logos (an
 * agent's, an action's) are materialized like any blok but are not
 * interfaces to open, so they are kept out of the default view.
 *
 * The server filters by context (`MaterializedBlokFilter.contexts`), so a
 * view is a query of its own.
 */
export const BLOK_VIEWS = [
  {
    key: 'interfaces',
    label: 'Interfaces',
    contexts: ['HTML', 'SCENE'],
    empty: 'No interfaces yet: bloks show up here once one is materialized for your agents, e.g. in orkestrator.',
  },
  {
    key: 'logos',
    label: 'Logos',
    contexts: ['LOGO', 'ACTION_LOGO'],
    empty: 'No logos: agents and actions that declare one show up here.',
  },
  { key: 'all', label: 'All', contexts: null, empty: 'No bloks yet.' },
] as const satisfies readonly { key: string; label: string; contexts: readonly Context[] | null; empty: string }[];

export type BlokView = (typeof BLOK_VIEWS)[number];

/** The view a `?view=` names; the first (interfaces) for anything else. */
export const blokView = (key: string | undefined): BlokView => BLOK_VIEWS.find((view) => view.key === key) ?? BLOK_VIEWS[0];

/** The `contexts` a view filters by; undefined for one that shows every context. */
export const blokViewContexts = (view: BlokView): ComponentContext[] | undefined =>
  view.contexts === null ? undefined : ([...view.contexts] as ComponentContext[]);
