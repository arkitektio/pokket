import type { ApolloClient } from "@apollo/client";
import {
  UserOptionsDocument,
  type UserOptionsQuery,
  type UserOptionsQueryVariables,
} from "@/lib/lok/api/graphql";
import {
  GetArrayDatasetsDocument,
  type GetArrayDatasetsQuery,
  type GetArrayDatasetsQueryVariables,
  GetScenesDocument,
  type GetScenesQuery,
  type GetScenesQueryVariables,
  Ordering,
} from "@/lib/mikro/api/graphql";
import {
  AgentOptionsDocument,
  type AgentOptionsQuery,
  type AgentOptionsQueryVariables,
  DescriptorOperator,
} from "@/lib/rekuest/api/graphql";

/**
 * Which objects of a structure there are, for a picker that names none of its
 * own (orkestrator's module `optionSources`, gathered here: pokket has no
 * module registry). Each answers over its own service's client, which the
 * caller resolves, and is keyed by the structure identifier it lists.
 */

/** One candidate, as a search answers it. */
export type StructureOption = { value: string; label: string; description?: string };

/** One of an action input's descriptor constraints (`port.requires`). */
export type DescriptorConstraint = { key: string; operator: string; value?: unknown };

export type StructureSearch = {
  /** What the user typed. */
  search?: string;
  /** The ids to resolve, instead of a listing. */
  values?: string[];
  /** The constraints of the input being filled, for a source that honours them. */
  requires?: readonly DescriptorConstraint[];
};

export type OptionSource = {
  identifier: string;
  /** The service key whose client answers. */
  service: string;
  /** The source narrows a listing to an input's `requires`; one without it is never handed any. */
  honoursRequires?: boolean;
  search: (client: ApolloClient<unknown>, args: StructureSearch) => Promise<StructureOption[]>;
};

const PAGE = { limit: 25 };

/** By id when the picker resolves what it already holds, by text otherwise. */
const filtersFor = ({ search, values }: StructureSearch) =>
  values?.length ? { ids: values } : search ? { search } : undefined;

const OPERATORS: ReadonlySet<string> = new Set(Object.values(DescriptorOperator));

const isOperator = (operator: string): operator is DescriptorOperator => OPERATORS.has(operator);

export const OPTION_SOURCES: readonly OptionSource[] = [
  {
    identifier: "@mikro/arraydataset",
    service: "mikro",
    search: async (client, args) => {
      // `no-cache`: a picker is opened to find what was just made.
      const { data } = await client.query<GetArrayDatasetsQuery, GetArrayDatasetsQueryVariables>({
        query: GetArrayDatasetsDocument,
        variables: { filters: filtersFor(args), pagination: PAGE, ordering: [{ createdAt: Ordering.Desc }] },
        fetchPolicy: "no-cache",
      });
      return (data?.arrayDatasets ?? []).map((dataset) => ({
        value: dataset.id,
        label: dataset.name || `Unnamed dataset (${dataset.id})`,
      }));
    },
  },
  {
    identifier: "@mikro/scene",
    service: "mikro",
    search: async (client, args) => {
      const { data } = await client.query<GetScenesQuery, GetScenesQueryVariables>({
        query: GetScenesDocument,
        variables: { filters: filtersFor(args), pagination: PAGE, ordering: [{ id: Ordering.Desc }] },
        fetchPolicy: "no-cache",
      });
      return (data?.scenes ?? []).map((scene) => ({
        value: scene.id,
        label: scene.name || `Unnamed scene (${scene.id})`,
      }));
    },
  },
  {
    // An agent input hands its `requires` on: a supervisor's actions take
    // only the agents that name it (`@rekuest/supervisor`).
    identifier: "@rekuest/agent",
    service: "rekuest",
    honoursRequires: true,
    search: async (client, { search, values, requires }) => {
      const constraints = (requires ?? []).flatMap(({ key, operator, value }) =>
        isOperator(operator) ? [{ key, operator, value }] : [],
      );
      const { data } = await client.query<AgentOptionsQuery, AgentOptionsQueryVariables>({
        query: AgentOptionsDocument,
        variables: {
          search: search || undefined,
          values: values?.length ? values : undefined,
          requires: constraints.length ? constraints : undefined,
        },
        fetchPolicy: "no-cache",
      });
      return data?.options ?? [];
    },
  },
  {
    identifier: "@lok/user",
    service: "lok",
    search: async (client, { search, values }) => {
      const { data } = await client.query<UserOptionsQuery, UserOptionsQueryVariables>({
        query: UserOptionsDocument,
        variables: { search: search || undefined, values: values?.length ? values : undefined },
        fetchPolicy: "no-cache",
      });
      return data?.options ?? [];
    },
  },
];

/** The source that lists `identifier`, if pokket has one. */
export const findOptionSource = (identifier: string): OptionSource | undefined =>
  OPTION_SOURCES.find((source) => source.identifier === identifier);
