/**
 * Rekuest's port kinds, as plain strings. The generated API has them as an
 * enum, but importing it at run time pulls the service's hooks (and their
 * toasts) into anything that only wants to read a port, tests included.
 * Values of the generated enum are these same strings.
 */
export const PortKind = {
  Bool: "BOOL",
  Date: "DATE",
  Dict: "DICT",
  Enum: "ENUM",
  Float: "FLOAT",
  Int: "INT",
  Interface: "INTERFACE",
  List: "LIST",
  MemoryStructure: "MEMORY_STRUCTURE",
  Model: "MODEL",
  Quantity: "QUANTITY",
  String: "STRING",
  Structure: "STRUCTURE",
  Union: "UNION",
} as const;

/** A string, not the union of the above: a server newer than this app may send a kind it does not know. */
export type PortKind = string;

export function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined;
}
