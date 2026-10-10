import type { ApolloClient } from "@apollo/client";
import { gql } from "@apollo/client";
import type { DocumentNode, OperationDefinitionNode, TypeNode } from "graphql";

/**
 * A search widget's query, run against the service its `ward` names: rekuest
 * ports carry the GraphQL query that lists their options, aliased `options`
 * with `value` and `label`. Orkestrator's `buildGraphQlWard`.
 */
export type SearchOption = { value: string; label: string; description?: string | null };

const documents = new Map<string, DocumentNode>();
const parse = (query: string): DocumentNode => {
  let document = documents.get(query);
  if (!document) {
    document = gql(query);
    documents.set(query, document);
  }
  return document;
};

const namedType = (type: TypeNode): string => (type.kind === "NamedType" ? type.name.value : namedType(type.type));

/** The variables a query declares, with the name of each one's type (`[ID!]` → `ID`). */
export const declaredVariables = (query: string): Record<string, string> => {
  try {
    const operation = parse(query).definitions.find((d): d is OperationDefinitionNode => d.kind === "OperationDefinition");
    return Object.fromEntries(
      (operation?.variableDefinitions ?? []).map((definition) => [definition.variable.name.value, namedType(definition.type)]),
    );
  } catch {
    return {};
  }
};

const SCALARS = ["ID", "String", "Int"];

/**
 * A form value as a query variable: a structure is `{ __identifier, object }`
 * in the form, but a query that filters by it declares an id, so a variable of
 * a scalar type gets the structure's id.
 */
export const asVariable = (value: unknown, type: string): unknown =>
  SCALARS.includes(type) && value && typeof value === "object" && "object" in (value as Record<string, unknown>)
    ? (value as { object: unknown }).object
    : value;

/** Only the variables the query declares are sent (one without `$search` is not refused), and none that are unset. */
export const onlyDeclared = (query: string, variables: Record<string, unknown>): Record<string, unknown> => {
  const declared = declaredVariables(query);
  return Object.fromEntries(
    Object.entries(variables)
      .filter(([key, value]) => key in declared && value !== undefined)
      .map(([key, value]) => [key, asVariable(value, declared[key])]),
  );
};

/** What the server answered, as options: entries without a value are dropped, ids become strings. */
export const toOptions = (data: unknown): SearchOption[] => {
  const options = (data as { options?: unknown } | null | undefined)?.options;
  if (!Array.isArray(options)) return [];
  return options.flatMap((option) => {
    if (!option || typeof option !== "object") return [];
    const { value, label, description } = option as Record<string, unknown>;
    if (value === null || value === undefined) return [];
    return [{ value: String(value), label: typeof label === "string" && label ? label : String(value), description: typeof description === "string" ? description : null }];
  });
};

export const runSearch = async (
  client: ApolloClient<any>,
  query: string,
  variables: Record<string, unknown>,
): Promise<SearchOption[]> => {
  const result = await client.query({ query: parse(query), variables: onlyDeclared(query, variables), fetchPolicy: "network-only" });
  return toOptions(result.data);
};
