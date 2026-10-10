import { notEmpty, PortKind } from "./kinds";
import type { PortablePort } from "./types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Arguments as rekuest hands them back (a task's `args`, an action's last
 * run), made fit to start a form from. Two things vary in the wild:
 *
 * - a structure comes as `{ __identifier, object }` or as a bare id, and its
 *   `object` as a string or a number; the form wants the first, with a string;
 * - an argument may be of a shape its port no longer has (the action changed);
 *   that argument is dropped, so its port starts from its default.
 */
const fit = (value: unknown, port: PortablePort): unknown => {
  if (value === null || value === undefined) return undefined;
  switch (port.kind) {
    case PortKind.Structure:
    case PortKind.MemoryStructure: {
      const object = isRecord(value) ? value.object : value;
      if (typeof object !== "string" && typeof object !== "number") return undefined;
      return { __identifier: port.identifier ?? (isRecord(value) ? value.__identifier : undefined), object: String(object) };
    }
    case PortKind.List: {
      const child = port.children?.filter(notEmpty)[0];
      if (!Array.isArray(value) || !child) return undefined;
      return value.map((item) => fit(item, child) ?? null);
    }
    case PortKind.Model:
      return isRecord(value) ? fitArgs(value, port.children?.filter(notEmpty) ?? []) : undefined;
    case PortKind.Int:
    case PortKind.Float:
      return typeof value === "number" || typeof value === "string" ? value : undefined;
    case PortKind.Bool:
      return typeof value === "boolean" ? value : undefined;
    case PortKind.String:
      return typeof value === "string" ? value : undefined;
    default:
      return value;
  }
};

/** Only the arguments the ports declare, each fitted to its port. */
export const fitArgs = (args: unknown, ports: readonly PortablePort[]): Record<string, unknown> => {
  if (!isRecord(args)) return {};
  const out: Record<string, unknown> = {};
  for (const port of ports) {
    const fitted = fit(args[port.key], port);
    if (fitted !== undefined) out[port.key] = fitted;
  }
  return out;
};

/**
 * What a form starts from: the first source that has a value for each port.
 * Sources are in order of say: what the caller passes in, what was last used
 * on this phone, the action's last run anywhere.
 */
export const prefill = (ports: readonly PortablePort[], ...sources: unknown[]): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const source of [...sources].reverse()) Object.assign(out, fitArgs(source, ports));
  return out;
};

/**
 * Starting values a phone form needs beyond the port's own default: a switch
 * that was never touched is off, not unanswered. (A required switch with no
 * default would otherwise refuse to submit until flipped twice.)
 */
export const withRestingValues = (ports: readonly PortablePort[], values: Record<string, unknown>): Record<string, unknown> => {
  const out = { ...values };
  for (const port of ports) {
    if (port.kind === PortKind.Bool && !port.nullable && (out[port.key] === null || out[port.key] === undefined) && (port.default === null || port.default === undefined)) {
      out[port.key] = false;
    }
  }
  return out;
};

/**
 * A value as the object it names, when it names one by a whole-number id:
 * what a page can be opened for. Rekuest hands structures over as
 * `{ __identifier, object }`, or as a bare id next to the port's identifier.
 */
export const structureRef = (
  value: unknown,
  port?: { kind: PortKind; identifier?: string | null } | null,
): { identifier: string; object: number } | null => {
  const wrapped = isRecord(value) ? value : null;
  const identifier =
    (typeof wrapped?.__identifier === "string" && wrapped.__identifier) || (port?.kind === PortKind.Structure ? port.identifier : null);
  const id = wrapped ? wrapped.object : value;
  if (!identifier || (typeof id !== "string" && typeof id !== "number") || !/^\d+$/.test(String(id))) return null;
  return { identifier, object: Number(id) };
};
