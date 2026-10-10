import { notEmpty, PortKind } from "./kinds";
import type { FormPort } from "./types";

/**
 * What this version of pokket can edit. Orkestrator has a widget for every
 * kind; pokket has the everyday ones, and shows the rest as "set this from
 * orkestrator". A form with such a port can still be submitted when the port
 * is optional or already has a value (from a previous run, or a default).
 */
const EDITABLE_KINDS: readonly string[] = [
  PortKind.Bool,
  PortKind.Date,
  PortKind.Enum,
  PortKind.Float,
  PortKind.Int,
  PortKind.String,
  PortKind.Structure,
  PortKind.List,
  PortKind.Model,
];

/** Widgets that need what pokket lacks: an agent's live state, or another action's port. */
const UNSUPPORTED_WIDGETS: readonly string[] = ["StateChoiceAssignWidget", "ProxyWidget"];

/** The widget that decides: a custom widget is drawn by its fallback. */
export const effectiveWidget = (port: FormPort): { __typename?: string; [key: string]: any } | null => {
  const widget = port.widget ?? null;
  if (widget?.__typename === "CustomAssignWidget") return widget.fallback ?? null;
  return widget;
};

export const isEditablePort = (port: FormPort): boolean => {
  const widget = effectiveWidget(port);
  if (widget?.__typename && UNSUPPORTED_WIDGETS.includes(widget.__typename)) return false;
  if (!EDITABLE_KINDS.includes(port.kind)) return false;
  if (port.kind === PortKind.List) {
    const child = port.children?.filter(notEmpty)[0] as FormPort | undefined;
    return !!child && isEditablePort(child);
  }
  return true;
};

/** Why a port cannot be edited here, in a few words. */
export const unsupportedReason = (port: FormPort): string => {
  const widget = effectiveWidget(port);
  if (widget?.__typename === "StateChoiceAssignWidget") return "It is chosen from an agent's live state.";
  if (widget?.__typename === "ProxyWidget") return "It follows another action's argument.";
  const kinds: Record<string, string> = {
    [PortKind.Dict]: "a dictionary",
    [PortKind.Union]: "one of several kinds",
    [PortKind.Quantity]: "a quantity with a unit",
    [PortKind.MemoryStructure]: "something an agent holds in memory",
    [PortKind.Interface]: "an interface",
    [PortKind.List]: "a list this app cannot edit",
  };
  return `It is ${kinds[port.kind] ?? `of a kind this app does not know (${port.kind.toLowerCase()})`}.`;
};

const isSet = (value: unknown) => value !== null && value !== undefined && value !== "";

/**
 * The ports that stop a form from being submitted from pokket: not editable
 * here, required, and without a value. `values` are form values; models are
 * walked, since a model's fields are edited one by one.
 */
export const blockingPorts = (ports: readonly FormPort[], values: Record<string, unknown> | null | undefined): FormPort[] =>
  ports.flatMap((port) => {
    const value = values?.[port.key];
    if (port.kind === PortKind.Model && isEditablePort(port)) {
      if (port.nullable && !isSet(value)) return [];
      return blockingPorts((port.children?.filter(notEmpty) ?? []) as FormPort[], (value ?? {}) as Record<string, unknown>);
    }
    if (isEditablePort(port) || port.nullable || isSet(value)) return [];
    return [port];
  });
