import type { PortKind } from "./kinds";

/**
 * The shapes the port engine reads, structurally: any port fragment at any
 * depth fits, as does a hand-written port in a test.
 */
export type PortChoice = { value: unknown; label: string; description?: string | null };

export type PortValidator = {
  call: unknown;
  dependencies?: readonly string[] | null;
  label?: string | null;
  errorMessage?: string | null;
  source?: string | null;
};

export type LabellablePort = {
  key: string;
  label?: string | null;
  kind: PortKind;
  identifier?: string | null;
  nullable?: boolean;
  // Loosely typed: the deepest port-fragment children omit some fields, so
  // this stays structural to accept fragments at any depth.
  children?: readonly any[] | null;
  choices?: readonly PortChoice[] | null;
};

export type PortablePort = LabellablePort & {
  default?: any | null | undefined;
  validators?: readonly PortValidator[] | null;
};

/** A port as a widget needs it. */
export type FormPort = PortablePort & {
  description?: string | null;
  referenceUnit?: string | null;
  widget?: any | null;
  effects?: readonly PortEffect[] | null;
};

export type PortEffect = {
  __typename?: string;
  kind?: string;
  call?: unknown;
  dependencies?: readonly string[] | null;
};

export type PortGroup = {
  key: string;
  title?: string | null;
  description?: string | null;
  ports: readonly string[];
  effects?: readonly PortEffect[] | null;
};

/** A structure value as rekuest carries it. */
export type StructureValue = { __identifier: string; object: string };
