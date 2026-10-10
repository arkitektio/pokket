import * as React from "react";
import { type FieldValues, type Resolver, useForm, type UseFormReturn } from "react-hook-form";
import { withRestingValues } from "./prefill";
import { createPortResolver } from "./resolver";
import type { PortablePort } from "./types";
import { buildZodSchema, portHash, portToDefaults, pruneUnmountedPorts, submittedDataToRekuestFormat } from "./values";

/**
 * Which fields are on screen. A field hidden by an effect is not validated and
 * not sent; orkestrator reads that off react-hook-form's registered names,
 * which follow the DOM. Here each field says so itself when it mounts.
 */
export type MountedFields = { mount: (name: string) => () => void; names: () => ReadonlySet<string> };

const createMountedFields = (): MountedFields => {
  const counts = new Map<string, number>();
  return {
    mount: (name) => {
      counts.set(name, (counts.get(name) ?? 0) + 1);
      return () => {
        const left = (counts.get(name) ?? 1) - 1;
        if (left <= 0) counts.delete(name);
        else counts.set(name, left);
      };
    },
    names: () => new Set(counts.keys()),
  };
};

export type PortForm = {
  form: UseFormReturn<FieldValues>;
  mounted: MountedFields;
  /** Validate, then hand over the arguments in rekuest's wire format. */
  submit: (onValid: (args: Record<string, unknown>) => void | Promise<void>) => () => Promise<void>;
};

/**
 * A form over an action's ports: orkestrator's `usePortForm`. Defaults come
 * from the ports and `overwrites` (wire format), validation from the ports'
 * kinds and the server's validators.
 */
export const usePortForm = (ports: readonly PortablePort[], overwrites: Record<string, unknown>): PortForm => {
  const mounted = React.useMemo(createMountedFields, []);

  const defaultValues = React.useMemo(
    () => portToDefaults([...ports], withRestingValues(ports, overwrites)) as FieldValues,
    [ports, overwrites],
  );

  const resolver = React.useMemo(() => {
    const inner = createPortResolver(buildZodSchema([...ports]), ports);
    const withMounted: Resolver<FieldValues> = (values, context, options) =>
      inner(values, context, { ...options, names: [...mounted.names()] as never });
    return Object.assign(withMounted, { mountedNames: inner.mountedNames });
  }, [ports, mounted]);

  const form = useForm<FieldValues>({ defaultValues, mode: "onSubmit", reValidateMode: "onChange", resolver });

  // New ports or new starting values: start over. Not on every render: the
  // key is the content, since callers build `overwrites` afresh.
  const key = `${portHash(ports)}:${JSON.stringify(overwrites)}`;
  const lastKey = React.useRef(key);
  const { reset } = form;
  React.useEffect(() => {
    if (lastKey.current === key) return;
    lastKey.current = key;
    reset(defaultValues);
  }, [key, defaultValues, reset]);

  const { handleSubmit } = form;
  const submit = React.useCallback<PortForm["submit"]>(
    (onValid) =>
      handleSubmit((data) =>
        onValid(pruneUnmountedPorts(submittedDataToRekuestFormat(data, [...ports]), [...ports], resolver.mountedNames())),
      ),
    [handleSubmit, ports, resolver],
  );

  return { form, mounted, submit };
};
