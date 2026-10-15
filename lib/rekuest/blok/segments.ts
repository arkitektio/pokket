/**
 * Path segments with a meaning of their own under a dependency key:
 * `<dep>/<action>/latest` is the task the action last ran as
 * (`latestTaskStore`), `<dep>/assets/<name>` a file the agent brings — which
 * pokket does not serve, so such paths are never mistaken for a state.
 */
export const LATEST_SEGMENT = 'latest';
export const ASSETS_SEGMENT = 'assets';
