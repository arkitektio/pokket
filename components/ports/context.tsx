import type { MountedFields } from '@/lib/ports/usePortForm';
import { dependencyScope, evaluatePortCall, parsePortCall } from '@/lib/ports/calls';
import { dependencyFieldName } from '@/lib/ports/paths';
import type { FormPort } from '@/lib/ports/types';
import { extractErrorMessages, pathToName } from '@/lib/ports/values';
import * as React from 'react';
import { useController, useFormContext, useFormState, useWatch } from 'react-hook-form';

const MountedContext = React.createContext<MountedFields | null>(null);
export const MountedProvider = MountedContext.Provider;

/**
 * A port's field in the form: its value and setter, and its place among the
 * fields on screen (see `MountedFields`).
 */
/**
 * Say that the field at `path` is on screen, for a control that edits it
 * through something other than `usePortField` (a list of item fields).
 */
export const useMountedField = (path: readonly string[]) => {
  const name = pathToName([...path]);
  const mounted = React.useContext(MountedContext);
  React.useEffect(() => mounted?.mount(name), [mounted, name]);
  return name;
};

export const usePortField = (path: readonly string[]) => {
  const name = useMountedField(path);
  const { field } = useController({ name });
  return { name, value: field.value as unknown, onChange: field.onChange as (value: unknown) => void, onBlur: field.onBlur };
};

/** What is wrong with a field, in one line; a list's or model's first complaint for the whole of it. */
export const useFieldError = (path: readonly string[]): string | null => {
  const name = pathToName([...path]);
  const { errors } = useFormState({ name });
  const error = path.reduce<any>((at, segment) => at?.[segment], errors);
  if (!error) return null;
  if (typeof error.message === 'string') return error.message;
  const nested = extractErrorMessages(error)[0];
  return nested ? nested.replace(/^[^:]*:\s*/, '') : null;
};

let unserializable = 0;
const keyOf = (value: unknown): string => {
  try {
    return JSON.stringify(value) ?? 'undefined';
  } catch {
    return `unserializable:${++unserializable}`;
  }
};

/**
 * Is the port on show? Its hide effects are calls over its own value and the
 * fields they depend on; all must say yes. A call that cannot be evaluated
 * keeps the port visible, so a broken rule never hides an input.
 */
export const usePortShown = (port: FormPort, path: readonly string[]): boolean => {
  const { control } = useFormContext();
  const hides = React.useMemo(() => (port.effects ?? []).filter((effect) => effect.__typename === 'HideEffect'), [port.effects]);
  const pathKey = pathToName([...path]);

  const names = React.useMemo(() => {
    const own = pathKey.split('.');
    return [pathKey, ...hides.flatMap((effect) => (effect.dependencies ?? []).map((name) => dependencyFieldName(name, own, [])))];
  }, [hides, pathKey]);
  const watched = useWatch({ control, name: names }) as unknown[];
  const watchedKey = keyOf(watched);

  return React.useMemo(() => {
    const [value, ...rest] = watched;
    // Each effect's dependencies follow the previous one's in `rest`.
    const starts = hides.map((_, index) => hides.slice(0, index).reduce((sum, effect) => sum + (effect.dependencies?.length ?? 0), 0));
    return hides.every((effect, index) => {
      const dependencies = effect.dependencies ?? [];
      const values = rest.slice(starts[index], starts[index] + dependencies.length);
      const parsed = parsePortCall(effect.call);
      const result = parsed.ok ? evaluatePortCall(parsed.value, { value, dependencies: dependencyScope(dependencies, values) }) : parsed;
      return result.ok ? Boolean(result.value) : true;
    });
    // `watched` is a new array every render; its content is the key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hides, watchedKey]);
};

/**
 * The values a search depends on, as `arg0`, `arg1`, … in the order the
 * widget lists them, and whether all are set. `/a/b` is absolute, `a/b`
 * relative to the widget's parent: orkestrator's `useWidgetDependencies`.
 */
export const useWidgetDependencies = (dependencies: readonly string[] | null | undefined, path: readonly string[]) => {
  const { control } = useFormContext();
  const pathKey = pathToName([...path]);
  const names = React.useMemo(() => {
    const parent = pathKey.split('.').slice(0, -1);
    return (dependencies ?? []).map((wanted) =>
      wanted.startsWith('/') ? wanted.slice(1).split('/').join('.') : [...parent, ...wanted.split('/')].join('.'),
    );
  }, [dependencies, pathKey]);
  const watched = useWatch({ control, name: names }) as unknown[];
  const watchedKey = keyOf(watched);
  return React.useMemo(
    () => ({
      values: Object.fromEntries(watched.map((value, index) => [`arg${index}`, value])) as Record<string, unknown>,
      met: watched.every((value) => value !== undefined && value !== null),
      waitingFor: names.filter((_, index) => watched[index] === undefined || watched[index] === null),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [watchedKey, names],
  );
};
